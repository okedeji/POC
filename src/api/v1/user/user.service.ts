import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UserLocation, UserLocationHistory } from '@kobotech/geo-schema';
import { Geohasher } from '@kobotech/corelocation';

import { GoogleService } from '../google/google.service';
import { AppLogger } from '../../../common';
import { UserLocationDTO, UserLocationsQuery } from '../../../common/';
import { CorelocationService } from '../corelocation/corelocation.service';

@Injectable()
export class UserService {
    constructor( 
        @InjectModel('UserLocation') private readonly UserLocationModel: Model<UserLocation>,
        @InjectModel('UserLocationHistory') private readonly UserLocationHistoryModel: Model<UserLocationHistory>,
        private readonly logger: AppLogger,
        private readonly googleService: GoogleService,
        private corelocationService: CorelocationService
    ){}

    /**
     * Save User location and user location history to the DB
     * @param  {UserLocationDTO} data
     * @returns Promise
     */
    async saveUserLocation (data: UserLocationDTO ): Promise<boolean> {
        const input = {
            lat: data.lat,
            lng: data.lng
        }
        const reverseGeocode = await this.googleService.processGeocode(input);
        let address: string;
        if (!reverseGeocode.status) {
            this.logger.warn(`${reverseGeocode.message}`);
            address = "Address unavailable";
        }
        else address = reverseGeocode.data.location.address

        const toStore = <UserLocation><unknown>{
            userId: data.userId,
            userType: data.userType,
            lastKnownLocation: {
                coordinates: [data.lng, data.lat],
                address: address,
                geohash: Geohasher.encode(data.lat, data.lng, 7).geohash
            },
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            mobile: data.mobile, 
            location: {
                coordinates: [data.lng, data.lat],
                address: address,
                geohash: Geohasher.encode(data.lat, data.lng, 7).geohash
            }
        }

        await this.UserLocationModel.updateOne({userId: data.userId, userType: data.userType}, {$set: toStore}, {upsert: true});
        const nUserLocationHistory = new this.UserLocationHistoryModel(toStore);
        await nUserLocationHistory.save()
        return true;
    }
    /**
     * GEt user location by user Id
     * @param  {number} userId
     * @returns Promise
     */
    async getUserLocation (userId: number): Promise<UserLocation> {
        const userLocation = await this.UserLocationModel.findOne({userId});

        return userLocation;
    }
    /**
     * Get all users that are closer to a given location.
     * @param  {UserLocationsQuery} data
     * @returns Promise
     */
    async getUserLocations (data: UserLocationsQuery): Promise<UserLocation[]> {
        const match = this.corelocationService.filter(data, "lastKnownLocation");

        const geoNear = {
            near: { type: "Point", coordinates: [parseFloat(data.lng), parseFloat(data.lat)] },
            distanceField: "distanceToPoint",
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

        const locations = await this.UserLocationModel.aggregate([
            queries
        ])

        return locations; 
    }
}
