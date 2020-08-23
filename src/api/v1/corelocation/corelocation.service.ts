import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as polyline  from 'google-polyline';
import { Redis } from '@kobotech/redis';
import * as MQ from '@kobotech/core-mq';
import * as coreHttp from '@kobotech/core-http';
import { Geohasher, Bearing, ETAInput, ETA } from '@kobotech/corelocation';
import { Google, InputData,  } from '@kobotech/geo-third-party';
import { TruckLocation,TruckRequest, LocationHistory, TripHistory, CustomerLocation, KobocareStation, UserLocation } from '@kobotech/geo-schema';

import { AppLogger } from '../../../common/logger';
import { TruckService } from '../truck/truck.service';
import { GoogleService } from '../google/google.service';
import { 
    AvailableTrucksQuery, TripUpdateDTO, SearchQuery, SetToAvailable, ActiveTripsDTO, TrucksDTO, AvailableOrdersQuery, 
    locationUpdateDTO, TrackTruckDto, LocationDto, OverviewQuery, TO_PICKUP, ARRIVED_AT_PICKUP, ARRVING_AT_PICKUP, 
    WAYBILL_COLLECTOR, TO_DELIVERY, ARRVING_AT_DESTINATION, AT_DESTINATION, CHANNELS, TAGS, Helpers
} from '../../../common';

@Injectable()
export class CorelocationService {
    constructor(
        @InjectModel('TruckLocation') private readonly truckLocationModel: Model<TruckLocation>,
        @InjectModel('TruckRequest') private readonly TruckRequestModel: Model<TruckRequest>,
        @InjectModel('TripHistory') private readonly TripHistoryModel: Model<TripHistory>,
        @InjectModel('KobocareStation') private readonly kobocareStationModel: Model<KobocareStation>,
        @InjectModel('CustomerLocation') private readonly customerLocationModel: Model<CustomerLocation>,
        @InjectModel('UserLocation') private readonly UserLocationModel: Model<UserLocation>,
        @InjectModel('LocationHistory') private locHistoryModel: Model<LocationHistory>,
        private logger: AppLogger,
        private truckService: TruckService,
        private googleService: GoogleService
    ) { }

    /**
     * Search for all available trucks and return by destination or by radius
     * @param  {AvailableTrucksQuery} data
     * @returns Promise
     */
    async avaiableTrucks(data: AvailableTrucksQuery): Promise<any> {
        try {
            const match = this.filter(data, "lastKnownLocation")
            match['available'] = true;
            match['onTrip'] = false;
            match['booked'] = { $ne: true }

            const geoNear = {
                near: { type: "Point", coordinates: [parseFloat(data.currentLng), parseFloat(data.currentLat)] },
                distanceField: "distanceToPoint",
                maxDistance: 0,
                spherical: true,
                uniqueDocs: true,
                query: match
            }

            let radius: number;
            let type: string;
            let poly : string

            if (data.radius) {
                type = 'radius';
                radius = parseInt(data.radius) * 1000;
                geoNear.maxDistance = radius;

            } else if (data.destinationLat && data.destinationLng) {
                type = 'destination';
                // calculate distance and use the distance as the maximum distance for the geoNear.
                const inputData: InputData = {
                    source: {
                        lat: parseFloat(data.currentLat),
                        lng: parseFloat(data.currentLng)
                    },
                    destination: {
                        lat: parseFloat(data.destinationLat),
                        lng: parseFloat(data.destinationLng)
                    }
                }

                // distance
                const distance = await Google.distance(inputData);
                if (distance.status === false) {
                    throw new Error(`Error occured in service while getting distance from third party => ${distance.error}`)
                } else {
                    radius = null
                    geoNear.maxDistance = distance.data.distance.value;
                }

                // polyline
                const directions = await Google.directions(inputData);
                if(!directions.data){
                    this.logger.warn(`Unable to get directions data => ${directions.error}`)
                   poly = ''
                } else if(directions.data.status === 'ZERO_RESULTS'){
                    this.logger.warn(`couuld not get directions for this coordinates => ${directions.data.status}`)
                    poly = ''
                } else {
                    poly = directions.data.routes[0].overview_polyline.points;
                    
                    // MongoDb does not allow 'LINESTRING' for 'NEAR' in geonear aggregate
                    /* const decoded = polyline.decode(poly)
                    decoded.forEach(el => {
                        [el[0], el[1]] = [el[1], el[0]]
                    });
                    console.log(decoded)
                    geoNear.near = { type: "LineString", coordinates: decoded } */
                }
            }

            const trucks = await this.truckLocationModel.aggregate([
                { $geoNear: geoNear },
                { $limit: 30 }
            ])

            const count = await this.truckLocationModel.aggregate([
                { $geoNear: geoNear },
                { $count: 'result' }
            ])

            return {
                tracked: data.tracked ? data.tracked === 'true' : true,
                radiusInKM: radius ? Math.floor(radius / 1000) : radius,
                polyline: poly ? poly : null,
                type,
                total: count.length > 0 ? count[0].result : 0,
                congestion: [], // TODO
                trucks
            }
        } catch (error) {
            throw new Error(error)
        }
    }
    /**
     * Search for all available orders/requests for trucks
     * @param  {AvailableOrdersQuery} data
     * @returns Promise
     */
    async availableOrders (data: AvailableOrdersQuery ): Promise<TruckRequest>{
        try {
            const match = this.filter(data, "pickupLocation");

            const geoNear = {
                near: { type: "Point", coordinates: [parseFloat(data.lng), parseFloat(data.lat)] },
                distanceField: "distanceToPoint",
                spherical: true,
                uniqueDocs: true,
                query: match
            }

            const orders = await this.TruckRequestModel.aggregate([
                { $geoNear: geoNear },
                { $limit: 100 }
            ])

            /* const ordersCount = await this.TruckRequestModel.aggregate([
                { $geoNear: geoNear },
                { $count: 'result' }
            ])
    
            return {
                tracked: data.tracked ? data.tracked === 'true' : true,
                total: ordersCount.length > 0 ? ordersCount[0].result : 0,
                orders
            } */

            return orders;

        } catch (error) {
            throw new Error(error)
        }
    }
    /**
     * Check the status of the truck on trip and alert necessary parties
     * @param  {string} regNumber
     * @param  {TrackTruckDto} truck
     * @returns Promise
     */
    async checkTripStatus(regNumber: string, truck: TrackTruckDto): Promise<string> {
        const expectedETA = truck.tripDetail.expectedETA.value / 60;
        const currentETA = truck.tripDetail.currentETA.value / 60;

        if(truck && truck.tripDetail.overviewStatus.toLowerCase() == TO_PICKUP.toLowerCase()){
            return this.checkAtPickup(expectedETA);
        }else{
            return this.checkAtDestination(expectedETA, currentETA, regNumber, truck);
        }
    }
    /**
     * Update TripService and TruckService with the recent location data
     * @param  {TrackTruckDto} data
     * @returns Promise
     */
    async updateTripAndTruck (data: TrackTruckDto): Promise<void> {
        const token = { Authtoken: data.Authtoken };
        const locationData = {
            lat: data.lastKnownLocation.coordinates[1],
            long: data.lastKnownLocation.coordinates[0],
            lastTrackedTime: new Date().toISOString(),
            from: "corelocation",
            address: data.lastKnownLocation.address,
            city: ' ',
            state: ' ',
            country: ' '
        };

        if(data.tripDetail){
            const url = process.env['AUTH_URL'];
            const path = `/trip/${data.tripDetail.tripId}/updateLocation`;

            await coreHttp.asyncJsonPut(`${url}${path}`, locationData, token);
        } else {
            const url = process.env['AUTH_URL'];
            const path = `/truck/regNumber/${data.regNumber}`;

            await coreHttp.asyncJsonPut(`${url}${path}`, locationData, token);
        }

        return;
    }
    /**
     * Get Overview Data on the map, truck, trips, customerLocations, KoboStations, and other PoI
     * @param  {OverviewQuery} data
     * @param  {string} token
     * @returns Promise
     */
    async overview(data: OverviewQuery, token:string): Promise<any> {
        try {
            const match = this.filter(data, "lastKnownLocation");

            if(data.customerId){
                const partnerIds = await this.getCustomerPartners(data.customerId, token);
                match['$or'] = [
                    { 'activePartner.id': { '$in': partnerIds } },
                    {'tripDetail.customerId': parseInt(data.customerId)}
                ]
                delete match['tripDetail.customerId'];
            }

            const geoNear = {
                near: { type: "Point", coordinates: [parseFloat(data.lng), parseFloat(data.lat)] },
                distanceField: "distanceToPoint",
                maxDistance: 5000, // 5KM
                spherical: true,
                uniqueDocs: true,
                query: match
            }
 
            // trucks
            const trucks = await this.truckLocationModel.aggregate([ { $geoNear: geoNear } ])

            // available count
            match.available = true;
            match.onTrip = false;
            geoNear.query = match;
            const availableCount = await this.truckLocationModel.aggregate([
                { $geoNear: geoNear },
                { $count: 'result' }
            ])

            // active count
            match.available = false;
            match.onTrip = true;
            geoNear.query = match;
            const activeCount = await this.truckLocationModel.aggregate([
                { $geoNear: geoNear },
                { $count: 'result' }
            ])

            // kobocare stations
            const kobocareStations = await this.kobocareStationModel.find();

            // customer locations
            const customerLocations = await this.customerLocationModel.find()

            // get location details
            const input = {
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lng)
            }
            const reverseGeocode = await this.googleService.processGeocode(input);
            let address: string;
            if (!reverseGeocode.status) {
                this.logger.warn(`${reverseGeocode.message}`);
                address = "Address unavailable";
            }
            else address = reverseGeocode.data.location.address

            return {
                tracked: data.tracked ? data.tracked === 'true' : true,
                lastKnownLocation: {
                    type: "Point",
                    coordinates: [parseFloat(data.lng), parseFloat(data.lat)],
                    geohash: Geohasher.encode(parseFloat(data.lat), parseFloat(data.lng), 7).geohash,
                    address
                },
                totalAvailableTrucks: availableCount.length > 0 ? availableCount[0].result : 0,
                totalActiveTrucks: activeCount.length > 0 ? activeCount[0].result : 0,
                trucks,
                customerLocations,
                kobocareStations
            }
        } catch (error) {
            throw new Error(error)
        }
    }
    /** 
     * Search all Active trips on the map and paginate them
     * @param  {ActiveTripsDTO} data
     * @returns Promise
     */
    async activeTrips (data: ActiveTripsDTO): Promise<any> {
        const match = this.filter(data, "lastKnownLocation");

        const limit = data.limit ? parseInt(data.limit) : 100;
        let page;
        if (data.page) {
            page = parseInt(data.page) < 1 ? 0 : (parseInt(data.page) - 1) * limit;
        } else {
            page = 0;
        }

        match.available = false;
        match.onTrip = true
        const geoNear = {
            near: { type: "Point", coordinates: [parseFloat(data.lng), parseFloat(data.lat)] },
            distanceField: "distanceToPoint",
            maxDistance: 10000, // 10KM
            spherical: true,
            uniqueDocs: true,
            query: match
        }

        const queries = {} as any;
        if(data.lng || data.lat) {
            queries.$geoNear = geoNear
        }else{
            queries.$match = match
        }

        // pagination count
        const totalDoc = await this.truckLocationModel.aggregate([
            queries,
            { $group: { _id: '_id', total: { $sum: 1 } } }
        ])

        const total = totalDoc.length > 0 ? totalDoc[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        // trucks
        let trucks;
        if (total > 0) {
            trucks = await this.truckLocationModel.aggregate([
                queries,
                { $skip: page },
                { $limit: limit },
            ])
        }

        // analytics
        if(queries.$geoNear){
            delete queries.$geoNear.query['tripDetail.overviewStatus']
        }else if(queries.$match){
            delete queries.$match['tripDetail.overviewStatus']
        }
        const group = {
            _id: null,
            toDelivery: { $sum: { $cond: [ { $eq: [ '$tripDetail.overviewStatus', 'toDelivery' ] }, 1, 0 ] } },
            toPickup: { $sum: { $cond: [ { $eq: [ '$tripDetail.overviewStatus', 'toPickup' ] }, 1, 0 ] } },
            atDestination: { $sum: { $cond: [ { $eq: [ '$tripDetail.overviewStatus', 'atDestination' ] }, 1, 0 ] } },
            stopped: { $sum: { $cond: [ { $eq: [ '$tripDetail.overviewStatus', 'stopped' ] }, 1, 0 ] } },
            diverted: { $sum: { $cond: [ { $eq: [ '$tripDetail.overviewStatus', 'diverted' ] }, 1, 0 ] } }
        }
        const noAnalytics = {
            toDelivery: 0,
            toPickup: 0,
            atDestination: 0,
            stopped: 0,
            diverted: 0
        }
        const analytics = await this.truckLocationModel.aggregate([
            queries,
            { $group: group },
            { $project: {_id: 0}}
        ]);

        const paginate = {
            tracked: data.tracked ? data.tracked === 'true' : true,
            currentPage: Math.round(page / limit) + 1,
            totalPages: totalPages,
            limit,
            total: total,
            analytics: analytics.length > 0 ? analytics[0] : noAnalytics,
            breakdown: [], //TODO
            congestion: [], //TODO
            trucks: trucks ? trucks : []
        };
        
        return paginate;
    }
    
    /**
     * save the trucklocation details
     * @param  {TrackTruckDto} data
     * @returns Promise
     */
    async saveLocation (data: TrackTruckDto): Promise<any> {

        const toStore = <TruckLocation><unknown>data;
        toStore.lastConnectionTime = new Date();

        const locSaved = await this.truckLocationModel.updateOne({regNumber: data.regNumber}, {$set: {
            ...toStore
        }}, {upsert: true});

        const locHistory = data.locations.map((loc: LocationDto) => {
            return {
                location: loc,
                regNumber: data.regNumber,
                assetClass: data.assetClass,
                imei: data.imei,
                bearing: loc.bearing || data.bearing,
                speed: loc.speed || data.speed,
                geohash: loc.geohash,
                source: data.source,
                provider: data.provider,
                dataTime: loc.timestamp,
                tripId: data.tripDetail? data.tripDetail.tripReadId : null,
                driverId: data.driver.id,
                partnerId: data.activePartner.id,
                customerId: data.tripDetail?  data.tripDetail.customerId : null,
                truckStatus: data.onTrip? "onTrip" : "diverted"
            }
        });

        const historySaved = await this.saveBatch(<LocationHistory[]><unknown>locHistory);

        return !!(locSaved || historySaved);
    }
    /**
     * Get Trucks, either customer dedicated or partner trucks
     * @param  {TrucksDTO} data
     * @param  {string} token
     * @returns Promise
     */
    async trucks (data: TrucksDTO, token: string): Promise<any> {
        const match = this.filter(data, 'lastKnownLocation');
        delete match['tripDetail.customerId'];

        if(data.customerId){
            const partnerIds = await this.getCustomerPartners(data.customerId, token);
            match['activePartner.id'] = { $in: partnerIds }
        }
        else if(data.partnerId) {
            match['activePartner.id'] = parseInt(data.partnerId);
        }

        const trucks = await this.truckLocationModel.aggregate([
            { $match: match },
            { $limit: 100 }
        ])

        const truckCount = await this.truckLocationModel.aggregate([
            { $match: match },
            { $count: 'result' }
        ])

        return {
            tracked: data.tracked ? data.tracked === 'true' : true,
            total: truckCount.length > 0 ? truckCount[0].result : 0,
            breakdown: [],
            congestions: [],
            trucks
        }
    }
    /**
     * Update tuckLocation when there is changes on coreTrip. create a new one if not exist
     * @param  {TripUpdateDTO} data
     * @returns Promise
     */
    async updateTrip (data: TripUpdateDTO): Promise<boolean> {

        const truckLocation = await this.truckLocationModel.findOne({regNumber: data.regNumber});
        if(!truckLocation){
            console.log("This regNumber is not currently on truckLLocation DB")
            const truck = await this.truckService.getCoreTruckByRegNumber(data);
            if(!truck) {
                console.log(`No truck in the system with regNumber: ${data.regNumber}`);
                return false;
            }

            const toCreate = await this.truckService.buildTruckLocationData(data, truck);

            const activeTrip =  await this.getTruckActiveTrip(data);
            if(!activeTrip){
                console.log(`There is no active trip for this truck ${data.regNumber} at the moment`);
                const ntruck = new this.truckLocationModel(toCreate);
                const saved = await ntruck.save();
                if(saved) return true;
                return false;
            }

            const builtTrip = await this.buildTripInfo(activeTrip);
            toCreate.available = false;
            toCreate.onTrip = true;
            toCreate.tripDetail = builtTrip;

            const ntruck = new this.truckLocationModel(toCreate);
            const saved = await ntruck.save();
            if(saved) return true;
            return false;
        }

        const trip = await this.truckLocationModel.findOne({regNumber: data.regNumber, 'tripDetail.tripId': data.tripId});
        let updated;
        if(!trip){
            const activeTrip =  await this.getTruckActiveTrip(data);
            if(!activeTrip){
                console.log(`There is no active trip for this truck ${data.regNumber} at the moment`);
                return false;
            }

            const built = await this.buildTripInfo(activeTrip);
            const toUpdate = <TruckLocation><unknown> {
                available: false,
                onTrip: true,
                tripDetail: built
            }

            updated = await this.truckLocationModel.updateOne({regNumber: data.regNumber}, {$set: toUpdate});
        }
        else if(trip && trip.tripDetail.delivered == true){
            const toUpdate = <TruckLocation><unknown>  {
                available: true,
                onTrip: false,
                tripDetail: null
            }

            updated = await this.truckLocationModel.updateOne({regNumber: data.regNumber}, {$set: toUpdate});
        }
        else if(trip && trip._id && trip.tripDetail.delivered != true){
            trip.tripDetail.tripStatus = data.status;

            if(data.transportStatus) {
                trip.tripDetail.transportStatus = data.transportStatus;
            }

            if(!data.loadedDate){
                trip.tripDetail.overviewStatus = 'toPickup';
            }
            else if( data.status === 'Transporting' || data.status === 'Loaded'){
                trip.tripDetail.overviewStatus = 'toDelivery';
                if(data.status === 'Transporting') trip.tripDetail.startDate = new Date(data.transportDate);
            }
            else if(data.status === 'At-destination'  || data.status === 'Offloaded'){
                trip.tripDetail.overviewStatus = 'atDestination';
            }
            else if(data.status === 'ReturningContainer'){
                trip.tripDetail.overviewStatus = 'returning';
            }

            if(data.loadedDate){
                trip.tripDetail.loadedDate = new Date(data.loadedDate)
            }

            if(data.status ==='Delivered'){
                const tripHistoryData = {
                    expectedETA: trip.tripDetail.expectedETA,
                    tripId: trip.tripDetail.tripId,
                    tripReadId: trip.tripDetail.tripReadId,
                    totalDistance: trip.tripDetail.totalDistance,
                    actualTripDuration: null,
                    remainingETA: null,
                    lastKnownLocation: trip.lastKnownLocation || null,
                    pickupLocation: trip.tripDetail.pickupLocation,
                    deliveryLocation: trip.tripDetail.deliveryLocation,
                    loadedDate: trip.tripDetail.loadedDate,
                    startDate: trip.tripDetail.startDate,
                    deliveryDate: new Date(data.dateDelivered),
                    partnerId: trip.tripDetail.partnerId,
                    driverId: trip.tripDetail.driverId,
                    customerId: trip.tripDetail.customerId,
                    regNumber: trip.regNumber,
                    asset: trip.assetClass
                }

                const start = new Date(trip.tripDetail.startDate).getTime();
                const end = new Date(data.dateDelivered).getTime();
                const actualETAInSeconds = (end - start) / 1000;
                const actualETAInWords = Helpers.formatToHMS(actualETAInSeconds);
                tripHistoryData.actualTripDuration = {
                    text: actualETAInWords,
                    value: actualETAInSeconds
                }

                if(actualETAInSeconds < trip.tripDetail.expectedETA.value){
                    const value = trip.tripDetail.expectedETA.value - actualETAInSeconds;
                    const text = Helpers.formatToHMS(value)
                    tripHistoryData.remainingETA = { value, text }
                }

                const nTripHistory = new this.TripHistoryModel(tripHistoryData);

                await nTripHistory.save();
                this.logger.log('Saved to tripHistory successfully')

                trip.available = true;
                trip.onTrip = false;
                trip.tripDetail = null
            }

            updated = await this.truckLocationModel.updateOne({regNumber: data.regNumber}, {$set: trip})
        }

        if(updated && updated.nModified ){
            return true;
        }
        console.log("Couldn't update truck location")
        return false;
    }
    /**
     * Manualy update Location from the dashboard without tracker
     * @param  {locationUpdateDTO} data
     * @returns Promise
     */
    async updateLocation (data: locationUpdateDTO): Promise<boolean> {
        const lastLocation = await this.truckLocationModel.findOne({regNumber: data.reg_number});

        let bearing;
        if(lastLocation && lastLocation.lastKnownLocation){
            const next = {
                latitude: data.lat,
                longitude: data.long
            }
            const current = {
                latitude: lastLocation.lastKnownLocation.coordinates[1],
                longitude: lastLocation.lastKnownLocation.coordinates[0],
            }
        
            const position = Bearing.calculateNewPosition(current, next);
            bearing = Bearing.calculateBearing(position.current, position.new);
        }

        const location = {
            coordinates: [data.long, data.lat],
            address: data.address,
            geohash: Geohasher.encode(data.lat, data.long, 7).geohash
        }
        const toSet = <TruckLocation><unknown> {
            lastConnectionTime: new Date(),
            lastKnownLocation: location,
            locations: [location],
            bearing: bearing ? bearing : 0
        }
        const updated = await this.truckLocationModel.update({regNumber: data.reg_number}, {$set: toSet});
        if(updated && updated.nModified) return true;
        return false;
    }

    /**
     * Get All traffic from on the way to destination from source
     * @param  {string} regNumber
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getCongestions (regNumber: string) {
        const truck = await this.truckLocationModel.findOne({regNumber});
        if(!truck) {
            return {
                status: false,
                message: `There is no truck with this regNumber ${regNumber} on Battlefield`
            };
        } else if(truck && !truck.tripDetail){
            return {
                status: false,
                message: `This truck with regNumber ${regNumber} is not on currently on trip`
            };
        } else {
            const source = {
                lat: truck.lastKnownLocation.coordinates[1],
                lng: truck.lastKnownLocation.coordinates[0]
            }
            let congestions;

            if(truck.tripDetail.overviewStatus === 'toPickup') {
                const destination = {
                    lat: truck.tripDetail.pickupLocation.coordinates[1],
                    lng: truck.tripDetail.pickupLocation.coordinates[0]
                }

                congestions = await this.calculateCongestions(source, destination, 'toPickup');
    
            } else if(truck.tripDetail.overviewStatus === 'toDelivery') {
                const destination = {
                    lat: truck.tripDetail.deliveryLocation.coordinates[1],
                    lng: truck.tripDetail.deliveryLocation.coordinates[0]
                }

                congestions = await this.calculateCongestions(source, destination, 'toDelivery');
            }

            return {
                status: congestions.status,
                data: congestions.data,
                message: congestions.message
            }
        }
    }
    /**
     * Searched trucks based on searchTerm. Tracked or not
     * @param  {SearchQuery} data
     * @returns Promise
     */
    async search (data: SearchQuery): Promise<TruckLocation> {
        const limit = data.limit ? parseInt(data.limit) : 10;
        data.tracked = 'false';
        const match = this.filter(data, 'lastKnownLocation')
        match['$text'] = {$search: data.searchTerm, $caseSensitive: false}

        const trucks = await this.truckLocationModel.aggregate([
            { $match: match },
            { $limit: limit },
        ])
        return trucks;
    }
    /**
     * Set truck to available and nullify all trips on trucks
     * @param  {SetToAvailable} data
     * @returns Promise
     */
    async setToAvailable (data: SetToAvailable): Promise<boolean> {
        const toSet = {
            available: true,
            onTrip: false,
            tripDetail: null
        }

        const updated = await this.truckLocationModel.updateOne({regNumber: data.regNumber}, {$set: toSet});

        if(updated && updated.nModified) return true
        return false
    }
    /**
     * Get all partners attached to a customer
     * @param  {} customerId
     * @param  {} token
     */
    private async getCustomerPartners (customerId, token) {
        try {
            const response = await Helpers.sendGetRequest('core', `/partner/customer/${customerId}/pageless`, token);
            const customerPartner = response.partners;
            const partnerIds = customerPartner.map(el => el.id);

            return partnerIds
        } catch (error) {
            throw new Error(`Unable to get customer partners => ${error}`);
        }
    }

    /**
     * helps filter query param to an appropriate database query
     * @param  {} query
     * @returns Record
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    filter(query, locationType): Record<string, unknown> {
        const { assetType, partnerId, customerId, status, userType, tracked, country, live } = query

        const location = `${locationType}.coordinates`, locationExists = {}, locationGTZero = {};
        locationExists[location] = { $exists: true };
        locationGTZero[location] = { $elemMatch: { $gt: 0} };

        const match = {};
        match['$and'] = [ locationExists, locationGTZero]

        if (assetType) {
            match['assetClass.type'] = {'$regex': `${assetType}`, '$options': 'i'};
        }

        if (partnerId) {
            match['activePartner.id'] = parseInt(partnerId);
        }

        if (customerId) {
            match['tripDetail.customerId'] = parseInt(customerId);
        }

        if (status) {
            match['tripDetail.overviewStatus'] = {'$regex': `${status}`, '$options': 'i'};
        }

        if (userType) {
            match['userType'] = {'$regex': `${userType}`, '$options': 'i'};
        }

        if (country) {
            match['country'] = {'$regex': `${country}`, '$options': 'i'};
        }

        if (live === 'true') {
            const dt = new Date();
            dt.setMinutes( dt.getMinutes() - 30 );
            const thitryMinutesAgo = new Date(dt);

            match['lastConnectionTime'] = { $gte: thitryMinutesAgo };
        }

        if(tracked === "false"){
            delete match['$and']
        }

        return match;
    }

    /**
     * check truck status on trip when trip status is atPickup 
     * @param currentETA in minutes
     */
    private checkAtPickup(currentETA: number): string {
        if(currentETA <= 1 ){
            return ARRIVED_AT_PICKUP;
        }else if(currentETA <= 5){
            return ARRVING_AT_PICKUP;
        }else{
            return TO_PICKUP;
        }
    } 
    
    /**
     * Check the ETA against delivery and alert the Field Officer and Waybill Collector
     * @param  {number} expectedETA in minutes
     * @param  {number} currentETA in minutes
     * @param  {string} regNumber
     * @param  {TrackTruckDto} truck
     * @returns Promise
     */
    private async checkAtDestination(expectedETA: number, currentETA: number, regNumber: string, truck: TrackTruckDto): Promise<string> {
        if(currentETA <= 60 && currentETA > 5) {
            const redisReponse = JSON.parse((await Redis.getter(`firstNotif-${WAYBILL_COLLECTOR}-${truck.tripDetail.tripReadId}`)).data);
            if(!redisReponse) {
                this.logger.log(`About to notify ${WAYBILL_COLLECTOR} about approaching truck ${regNumber}`)
                this.alertOfficer(regNumber, truck.tripDetail.deliveryLocation, truck, truck.tripDetail.currentETA.text, WAYBILL_COLLECTOR);
                Redis.setter(`firstNotif-${WAYBILL_COLLECTOR}-${truck.tripDetail.tripReadId}`, 'true');
            }
            this.logger.log(`${WAYBILL_COLLECTOR} already notified about approaching truck ${regNumber}`)
            return TO_DELIVERY;
        }
        else if(currentETA <= 5 && currentETA > 1){
            const redisReponse = JSON.parse((await Redis.getter(`secondNotif-${WAYBILL_COLLECTOR}-${truck.tripDetail.tripReadId}`)).data);
            if(!redisReponse) {
                this.logger.log(`About to notify ${WAYBILL_COLLECTOR} about approaching truck ${regNumber}`)
                this.alertOfficer(regNumber, truck.lastKnownLocation, truck, truck.tripDetail.currentETA.text, WAYBILL_COLLECTOR);
                Redis.setter(`secondNotif-${WAYBILL_COLLECTOR}-${truck.tripDetail.tripReadId}`, 'true');
            }
            this.logger.log(`${WAYBILL_COLLECTOR} already notified about approaching truck ${regNumber}`)
            return ARRVING_AT_DESTINATION;
        }
        else if(currentETA <=1) return AT_DESTINATION;
        return TO_DELIVERY;
    }
    /**
     * Alert neccessary officer about the status of truck on trip
     * @param  {string} regNumber
     * @param  {LocationDto} lastKnownLocation
     * @param  {TrackTruckDto} truck
     * @param  {string} duration
     * @param  {string} userType
     * @returns Promise
     */
    private async alertOfficer(regNumber: string, lastKnownLocation: LocationDto, truck: TrackTruckDto, duration: string, userType: string): Promise<void> { 
        const user = await this.UserLocationModel.findOne({
            userType,
            lastKnownLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lastKnownLocation.coordinates[0], lastKnownLocation.coordinates[1]]
                    }
                }
            }
        })

        if(!user) {
            this.logger.warn('No Waybill Colector was found closser to this location')
            return;
        }
        
        const data = {
            tag: null,
            firstName: user.firstName,
            phone: user.mobile,
            id: user.userId,
            email: user.email,
            tripId: truck.tripDetail.tripReadId,
            regNumber: regNumber,
            driverName: truck.tripDetail.driverName,
            driverMobile: truck.tripDetail.driverMobile,
            assetClass: truck.assetClass,
            destination: truck.tripDetail.deliveryLocation.address,
            customerName: truck.tripDetail.customerName,
            duration
        }

        if(userType === WAYBILL_COLLECTOR) data.tag = TAGS.WAYBILL_COLLECT

        MQ.addToQueue(CHANNELS.GEO_NOTIF, data);
        this.logger.log('Waybill collector found and sent to queue to be messaged')
        return;
    }
    /**
     * Save array of location History into the Location History Collection
     * @param  {LocationHistory[]} data
     * @returns Promise
     */
    private async saveBatch(data: LocationHistory[]): Promise<LocationHistory[]>{
        return this.locHistoryModel.insertMany(data);
    }
    /**
     * Get all active trips on the map
     * @param  {} data
     */
    private async getTruckActiveTrip (data) {
        const url = `${process.env.AUTH_URL}/trip/active/regNumber/${data.regNumber}`;
        const token = data.token;

        try {
            const tripResponse = await coreHttp.asyncJsonGet(url, {}, token)
            return tripResponse ? tripResponse.trip : false;
        } catch (error) {
            console.log(error);
            return false;
        }
    }
    /**
     * Helps build the data that goes into the truckLocation database as tripDetail
     * @param  {} trip
     */
    private async buildTripInfo (trip) {
        const result = {
            tripId: trip._id,
            tripReadId: trip.tripId,
            tripStatus: trip.status,
            salesOrderNo: trip.salesOrderNo,
            waybillNo: trip.waybillNo,
            overviewStatus: null, 
            loadedDate: null,
            acceptanceDateTime: trip.startDate,
            transportStatus: trip.transportStatus,
            delivered: trip.delivered,
            expectedETA: { 
              text: ' ',
              value: 0
            } ,
            currentETA: { 
              text: ' ',
              value: 0
            },
            totalDistance: 0,
            remainingDistance: 0,
            goodType: trip.goodType,
            goodCategory: trip.goodCategory,
            KoboBusinessUnitTag: trip.KoboBusinessUnitTag,
            pickupLocation: null,
            deliveryLocation: null,
            dropOffs: [],
            sourceCountry: trip.sourceCountry,
            deliveryCountry: trip.destinationCountry,
            requestCountry: trip.requestCountry,
            source: trip.source,
            destination: trip.destination,
            // whiteListedStop: WhiteListedStop, TODO
            // whiteListedStopHistory: WhiteListedStop[], TODO
            // blacklistedStop: BlackList, TODO
            // blackListedStopHistory: BlackList[], TODO
            // diverted: BlackList, TODO
            // diversion: BlackList[], TODO
            // flagged: Flagged,
            // flaggHistory: Flagged[],
            partnerId: trip.partnerId,
            partnerName: trip.partnerName,
            partnerMobile: trip.partnerMobile,
            partnerPushToken: '',
            driverId: trip.driver.id,
            driverMobile: trip.driver.mobile,
            driverName: trip.driver.name,
            driverPushToken: '',
            customerId: trip.customerId,
            customerName: trip.customerName,
            customerMobile: trip.customerPhone,
            customerEmail: '',
            customerPushToken: '',
            travelledRoutePolyline: '',
            bestRoutePolyline: '', 
            currentBestRoute: ''
        };


        // Overview status
        if(!trip.loadedDate){
          result.overviewStatus = 'toPickup';
        }
        else if( trip.status === 'Transporting' || trip.status === 'Loaded'){
            result.overviewStatus = 'toDelivery';
        }
        else if(trip.status === 'At-destination'  || trip.status === 'Offloaded'){
            result.overviewStatus = 'atDestination';
        }
        else if(trip.status === 'ReturningContainer'){
            result.overviewStatus = 'returning';
        }

        if(trip.loadedDate){
          result.loadedDate = new Date(trip.loadedDate);
        }

        // Pickup, delivery and dropOffs locations
        result.pickupLocation = {
            coordinates: [parseFloat(trip.pickupStation.location.coordinates[1]), parseFloat(trip.pickupStation.location.coordinates[0])],
            address: trip.pickupStation.address
        };
        result.deliveryLocation = {
            coordinates: [parseFloat(trip.deliveryStation.location.coordinates[1]), parseFloat(trip.deliveryStation.location.coordinates[0])],
            address: trip.deliveryStation.address
        };

        result.dropOffs = trip.dropOff.map(el => {
            return {
              coordinates: [parseFloat(el.location.location.coordinates[1]), parseFloat(el.location.location.coordinates[0])],
              address: el.location.address
            };
        });

        // expectedETA
        if(trip.estimatedTimeOfArrivalInSeconds && trip.estimatedTimeOfArrival){
            result.expectedETA.text = trip.estimatedTimeOfArrival;
            result.expectedETA.value = parseInt(trip.estimatedTimeOfArrivalInSeconds);
        }else{
            const etaInput: ETAInput = {
              source: `${result.pickupLocation.coordinates[1]},${result.pickupLocation.coordinates[0]}`,
              destination: `${result.deliveryLocation.coordinates[1]},${result.deliveryLocation.coordinates[0]}`,
            };
            const nETA = await ETA.calculateETA(etaInput);
            if(!nETA || !nETA.status){
              console.log("Couldn't get ETA", nETA.error);
            }else {
              result.expectedETA.text = nETA.estimatedTimeOfArrival;
              result.expectedETA.value = parseInt(`${nETA.estimatedTimeOfArrivalInSeconds}`);
            }
        }

        result.bestRoutePolyline = await this.getBestRoutePolyline(result.pickupLocation.coordinates, result.deliveryLocation.coordinates) || "";
         
        // totalDistance
        if(trip.estimatedDistanceInKM){
          result.totalDistance = trip.estimatedDistanceInKM / 1000; // in Meters
        }else{
          result.totalDistance = await this.getDistance(result.pickupLocation.coordinates, result.deliveryLocation.coordinates) || 0;
        }

        return result; 
    }
    /**
     * Helps get polyline for the best route
     * @param  {number[]} source
     * @param  {number[]} destination
     * @returns Promise
     */
    private async getBestRoutePolyline(source: number[], destination: number[]): Promise<string> {
        const currentPolyInput: InputData = {
          source: {
            lat: source[1],
            lng: source[0]
          },
          destination: {
            lat: destination[1],
            lng: destination[0]
          }
        };
  
        const bestRoute = await this.BestRoute(currentPolyInput);
        return bestRoute || "";
    }
    /**
     * Help get best route for a particular trip
     * @param  {InputData} data
     * @returns Promise
     */
    private async BestRoute (data: InputData): Promise<any> {
        const directions = await Google.directions(data);
        let polyline = null;

        if(!directions.data){
          this.logger.log(`Unable to get directions data ${directions.error}`);
          return " ";
        } 
        else if(directions.data.status === 'ZERO_RESULTS'){
          this.logger.log(`Could not get directions for this coordinates ${directions.data.status}`);
          return " ";
        } 
        else {
          const enrichedPolyline = directions.data.routes[0].overview_polyline.points;
          polyline = await this.cleanPolyline(enrichedPolyline);
        }
        return polyline || " ";
    }
    /**
     * Helps get distance from one source to another destination
     * @param  {number[]} source
     * @param  {number[]} destination
     */
    private async getDistance(source: number[], destination: number[]) {
        const polyline: InputData = {
          source: {
            lat: source[1],
            lng: source[0]
          },
          destination: {
            lat: destination[1],
            lng: destination[0]
          }
        };
  
        const nRemainingDistance = await Google.distance(polyline);
        if(!nRemainingDistance.data){
          this.logger.log(`Unable to get remainingDistance ${nRemainingDistance.error}`);
        } else if(nRemainingDistance.data.status === 'ZERO_RESULTS'){
          console.log(`Could not get distance for this coordinates ${nRemainingDistance.data.status}`);
        }else {
          return nRemainingDistance.data.distance.value || 0;
        }
    }

    private async cleanPolyline(polylines: string) {
        // const encodedPolyline = polylines.join('');
        const decodedPolyline: any[] = this.decode(polylines).map(loc => [loc.latitude, loc.longitude]);
        // console.log('decoded cordinate' , decodedPolyline);
  
        // const correctLoc = await this.snapToRoadCorrection(decodedPolyline);
        // console.log('snap to road correct', correctLoc);
        const reachPolyline = await polyline.encode(decodedPolyline);
  
        return reachPolyline || "";
    }

    decode(encoded: string): any[] {

        // array that holds the points
    
        const points = []
        let index = 0;
        const len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
          let b, shift = 0, result = 0;
          do {
    
            b = encoded.charAt(index++).charCodeAt(0) - 63;//finds ascii                                                                                    //and substract it by 63
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
    
    
          const dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
          lat += dlat;
          shift = 0;
          result = 0;
          do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          const dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
          lng += dlng;
    
          points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) })
    
        }
        return points;
    }
    /**
     * Calculate and return al traffic on a particular route from source to destination
     * @param  {} source
     * @param  {} destination
     * @param  {} type
     */
    private async calculateCongestions (source, destination, type) {
        const input: InputData = {
            source: source,
            destination: destination
        }
        const directions = await Google.directions(input);
        if(!directions.data){
            return {
                status: true,
                message: `Unable to get directions data => ${directions.error}`
            };
        } else if(directions.data.status === 'ZERO_RESULTS'){
            return {
                status: true,
                message: `couuld not get directions for this coordinates => ${directions.data.status}`
            };
        } else {
            const totalDuration = 1800 // 30mins
            const steps = directions.data.routes[0].legs[0].steps;
            const refinedSteps = []
            let duration = 0;

            for (const step of steps) {
                if(duration >= totalDuration){
                    break;
                } 

                const input: any = {
                    source: step.start_location,
                    destination: step.end_location
                }

                const directions = await Google.directions(input);

                const res = {
					startLocation: {
						coordinates: [input.source.lng, input.source.lat],
						address: directions.data.routes[0].legs[0].start_address
					},
					endLocation: {
						coordinates: [input.destination.lng, input.destination.lat],
						address: directions.data.routes[0].legs[0].end_address,
					},
					delayInMinutes: parseFloat((directions.data.routes[0].legs[0].duration_in_traffic.value/60).toFixed(2))
				}

                refinedSteps.push(res);

                duration += step.duration.value;
            }

            return {
                status: true,
                data: {type, congestions:refinedSteps}
            };
        }
    }
    
}
