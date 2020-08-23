////<reference path="../../../../node_modules/@kobotech/core-http/lib/core-http.js" />

import * as coreHttp from '@kobotech/core-http';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Geohasher, ETA, ETAInput } from '@kobotech/corelocation';
import { Google, InputData,  } from '@kobotech/geo-third-party';
import { TruckRequest, TruckLocation } from '@kobotech/geo-schema';

import { AppLogger } from '../../../common';
import { TruckRequestDTO, CreateTruckDTO } from '../../../common/';

@Injectable()
export class TruckService {

    constructor (
        private readonly logger: AppLogger,
        @InjectModel('TruckLocation') private readonly truckLocationModel: Model<TruckLocation>,
        @InjectModel('TruckRequest') private readonly TruckRequestModel: Model<TruckRequest>
    ){}

    /**
     * Save Truck Request into the DB
     * @param  {TruckRequestDTO} data
     * @returns Promise
     */
    async saveTruckRequest (data: TruckRequestDTO): Promise<boolean> {
        try {
            const toSave = {
                id: data.id,
                customerId: data.customerId,
                customerName: data.customerName,
                pickupLocation: {
                    coordinates: [data.pickupLng, data.pickupLat],
                    address: data.pickupAddress,
                    geohash: Geohasher.encode(data.pickupLat, data.pickupLng, 7).geohash
                },
                pickupGeohash: Geohasher.encode(data.pickupLat, data.pickupLng, 7).geohash,
                assetClass: data.assetClass,
                deliveryLocation: null,
                deliveryGeohash: null,
                expectedETA: { 
                    text: ' ',
                    value: 0
                },
                totalDistance: null
            }
            if(data.deliveryAddress){
                toSave.deliveryLocation = {
                    coordinates: [data.deliveryLng, data.deliveryLat],
                    address: data.deliveryAddress,
                    geohash: Geohasher.encode(data.deliveryLat, data.deliveryLng, 7).geohash
                }
                toSave.deliveryGeohash = Geohasher.encode(data.deliveryLat, data.deliveryLng, 7).geohash

                const inputData: InputData = {
                    source: {
                        lat: data.pickupLat,
                        lng: data.pickupLng
                    },
                    destination: {
                        lat: data.deliveryLat,
                        lng: data.deliveryLng
                    }
                }

                //Distance
                const distance = await Google.distance(inputData);
    
                if (distance.status === false) {
                    this.logger.warn(`Error occured in service while getting distance from third party for truck request => ${distance.error}`);
                } 
                else if(!distance.data.distance) {
                    this.logger.warn(`Couild not get distance for these coordinates => ${distance.data}`);
                }
                else {
                    toSave.totalDistance = distance.data.distance.value
                }

                // ETA 
                const etaInput: ETAInput = {
                    source: `${data.pickupLat},${data.pickupLng}`,
                    destination: `${data.deliveryLat},${data.deliveryLng}`,
                }
                const nETA = await ETA.calculateETA(etaInput)
                if(!nETA.status){
                    this.logger.warn(`Couldn't get ETA => ${nETA.error}`);
                }else {
                    toSave.expectedETA.text = nETA.estimatedTimeOfArrival;
                    toSave.expectedETA.value = parseInt(`${nETA.estimatedTimeOfArrivalInSeconds}`);
                }
        
            }
            
            const nTruckRequest = new this.TruckRequestModel(toSave);
    
            await nTruckRequest.save()
            return true;
        } catch (error) {
            throw new Error(error);
        }
    }
    /**
     * Get an individual Truck Details 
     * @param  {string} regNumber
     * @returns Promise
     */
    async getTruckByRegNumber (regNumber: string): Promise<TruckLocation> {
        const truck = await this.truckLocationModel.findOne({regNumber: regNumber});

        return truck;
    }
    /**
     * Create A truck on the DB when created on core
     * @param  {CreateTruckDTO} data
     * @returns Promise
     */
    async createTruck (data: CreateTruckDTO): Promise<boolean> {
        const truckLocation = await this.truckLocationModel.findOne({regNumber: data.regNumber});
        if(truckLocation){
            console.log(`Truck with regNumber: ${data.regNumber} already exists in the DB`);
            return false;
        }

        const truck = await this.getCoreTruckByRegNumber(data);
        if(!truck) {
            console.log(`No truck was created with regNumber: ${data.regNumber}`);
            return false;
        }

        const toCreate = await this.buildTruckLocationData(data, truck);

        const ntruck = new this.truckLocationModel(toCreate);
        const saved = await ntruck.save();
        if(saved)return true;
        return false;
    }

    /**
     * Helps to book truck for a partner and add the booked key to the document
     * @param  {string} regNumber
     * @param  {} user
     * @returns Promise
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async bookTruck (regNumber: string, user): Promise<boolean> {
        const toSet = <TruckLocation><unknown> {
            booked: true,
            bookedDate: new Date(),
            bookedBy: {
                name: `${user.firstName}, ${user.lastName}`, 
                email: user.email,
                userId: user.accountId
            }
        }

        const updated = await this.truckLocationModel.updateOne({regNumber: regNumber}, {$set: toSet});
        if(updated && updated.nModified) return true
        return false
    }
    /**
     * Respond with an array of Booked trucks
     * @returns Promise
     */
    async getAllBooked (): Promise<TruckLocation[]> {
        const trucks = await this.truckLocationModel.find({booked: true});

        return trucks;
    }
    /**
     * Get Truck Details on Core by Registration/plate number
     * @param  {CreateTruckDTO} data
     * @returns Promise
     */
    async getCoreTruckByRegNumber(data: CreateTruckDTO): Promise<any>{

        const url = `${process.env.AUTH_URL}/truck/regNumber/${data.regNumber}`
        const token = data.token;

        try {
            const truckResponse = await coreHttp.asyncJsonGet(url, {}, token)
            return truckResponse ? truckResponse.fleet : null;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    /**
     * Build Truck Location Data to be saved in truckLocation collection
     * @param  {CreateTruckDTO} data
     * @param  {} truck
     * @returns Promise
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async buildTruckLocationData(data: CreateTruckDTO, truck): Promise<any>{
        const toCreate = {
            regNumber: data.regNumber,
            assetClass: null,
            available: true,
            millage: null,
            geohash: null,
            source: 'web',
            provider: null,
            country: null,
            lastKnownLocation: null,
            locations: [],
            driver: null,
            activePartner: null,
            onTrip: false,
            tripDetail: null
          };
        
        //assetClass
        toCreate.assetClass = {
            id: truck.asset._id,
            type: truck.asset.type,
            unit: truck.asset.unit,
            size: truck.asset.size,
            name: truck.asset.name
        };

        toCreate.country = truck.country || ' ';

        toCreate.activePartner = {
            id: truck.activeOwnerId ? truck.activeOwnerId : truck.ownerId,
            name: truck.activeBusinessName ? truck.activeBusinessName : truck.ownerBusinessName
        }
        toCreate.lastKnownLocation = {
            coordinates: [8.546188, 9.082000], //Nigeria, TODO: MAP countries to their centers
            address: '3 Dauda Alhaji Street Gauraka, Tafa',
            geohash: Geohasher.encode(9.216428, 8.546188, 7).geohash
        }
        toCreate.locations = [ toCreate.lastKnownLocation ]
        toCreate.millage = 0
        toCreate.geohash = Geohasher.encode(9.082000, 8.675300, 7).geohash;

        return toCreate;
    }
}
