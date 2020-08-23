import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Geocoded } from '@kobotech/geo-schema';
import { Google, InputData,  } from '@kobotech/geo-third-party';
import { Geohasher } from '@kobotech/corelocation';

import { ReverseGeocodeQuery, Autocomplete, PlaceQuery, DirectionsQuery } from '../../../common/';

@Injectable()
export class GoogleService {
    constructor(
        @InjectModel('Geocoded') private readonly geocodedModel: Model<Geocoded>,
    ){}
    /**
     * convert the coordinates to readable address
     * @param  {ReverseGeocodeQuery} data
     * @returns Promise
     */
    async reverseGeocode(data: ReverseGeocodeQuery): Promise<Geocoded> {
        const input = {
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lng)
        }
        const res = await this.processGeocode(input);
        if(!res.status){
            throw new Error(res.message);
        }
        return res.data;
    }
    /**
     * respond with list of full address from a searchTerm
     * @param  {Autocomplete} data
     * @returns Promise
     */
    async autocomplete(data: Autocomplete): Promise<any> {
        const result = await Google.autocomplete(data.input);

        if (result.status === false) {
            throw new Error(`Error occured while performing autocomplete operations => ${result.error}`);
        }

        const processed = result.data.predictions.map(el => {
            return {
                description: el.description,
                placeId: el.place_id,
                terms: el.terms
            }
        });
        return processed;
    }
    /**
     * respond with a full place data from the place Id inputted
     * @param  {PlaceQuery} data
     * @returns Promise
     */
    async place(data: PlaceQuery): Promise<any> {
        const result = await Google.places(data.placeId);

        if (result.status === false) {
            throw new Error(`Error occured in service while getting place => ${result.error}`);
        }

        return {
            addressComponents: result.data.result.address_components,
            formattedAddress: result.data.result.formatted_address,
            geometry: result.data.result.geometry,
            placeId: result.data.result.place_id
        }
    }

    /**
     * respond with the directions data given source and destination
     * @param  {DirectionsQuery} data
     * @returns Promise
     */
    async direction(data: DirectionsQuery): Promise<any> {

        const inputData: InputData = {
            source: {
                lat: parseFloat(data.sourceLatitude),
                lng: parseFloat(data.sourceLongitude)
            },
            destination: {
                lat: parseFloat(data.destinationLatitude),
                lng: parseFloat(data.destinationLongitude)
            }
        }

        const result = await Google.directions(inputData);

        if (result.status === false) {
            throw new Error(`Error occured in service while getting direction => ${result.error}`)
        }

        return result.data
    }

    /**
     * Helps perform the reverse geocode operation and cost saving
     * @param  {} data
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async processGeocode (data: GeocodeInput) {
        const geohash = Geohasher.encode(data.lat, data.lng, 8).geohash // 38.2m X 19.1m

        let geocoded = await this.geocodedModel.findOne({ 'location.geohash': geohash });

        if (geocoded && geocoded._id) {
            geocoded.location.coordinates = [data.lng, data.lat]

            const currentTime = new Date().getTime();
            const interval = Math.ceil((currentTime - new Date(geocoded.updatedAt).getTime()) / 1000);
            const thirtyDays = 2592000;

            if (interval >= thirtyDays) {
                const geocode = await Google.reverseGeocode({ lat: data.lat, lng: data.lng })

                if (geocode.status === false) {
                    return {
                        status: false,
                        message: `Error occured while performing reverse geocoding => ${geocode.error}`
                    }
                } else {
                    geocoded.location.address = geocode.data.address
                    await this.geocodedModel.updateOne({ geohash }, { $set: geocoded })
                }
            }
        } else {
            const geocode = await Google.reverseGeocode({ lat: data.lat, lng: data.lng })

            if (geocode.status === false) {
                return {
                    status: false,
                    message: `Error occured while performing reverse geocoding => ${geocode.error}`
                }
            } else {
                const nGeocoded = new this.geocodedModel({
                    location: {
                        coordinates: [data.lng, data.lat],
                        geohash,
                        address: geocode.data.address
                    }
                });

                geocoded = await nGeocoded.save();
            }
        }

        return {
            status: true,
            data: geocoded
        }
    }
}

interface GeocodeInput {
    lat: number;
    lng: number;
}