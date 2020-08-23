import { Controller, Get, Query } from '@nestjs/common';

import { Response, ReverseGeocodeQuery, Helpers, Autocomplete, PlaceQuery, DirectionsQuery } from '../../../common/';
import { GoogleService } from './google.service';

@Controller()
export class GoogleController {
    constructor( 
        private readonly googleService: GoogleService
    ){}

    @Get('/reverse/geocode')
    async reverseGeocode (@Query() query: ReverseGeocodeQuery): Promise<Response> {
        try{
        query.source = query.source ? Helpers.capitalize(query.source) : "Google"
        const geocoded = await this.googleService.reverseGeocode(query);
        return Helpers.sendJsonResponse({geocoded}, "Reverse Geocoding done successfully");

        }catch(error){
            throw Error(error)
        }
    }

    @Get('/autocomplete')
    async autocomplete (@Query() query: Autocomplete): Promise<Response> {
        try {
            query.source = query.source ? Helpers.capitalize(query.source) : "Google"
            const autocomplete = await this.googleService.autocomplete(query);
            return Helpers.sendJsonResponse({autocomplete}, "Place Autocomplete gotten successfully");
        } catch (error) {
            throw Error(error)
        }
    }

    @Get('/place')
    async place (@Query() query: PlaceQuery): Promise<Response> {
        try {
            query.source = query.source ? Helpers.capitalize(query.source) : "Google"
            const place = await this.googleService.place(query);
            return Helpers.sendJsonResponse({place}, "Place gotten successfully");
        } catch (error) {
            throw Error(error)
        }
    }

    @Get('/direction')
    async direction (@Query() query: DirectionsQuery): Promise<Response> {
        try {
            query.source = query.source ? Helpers.capitalize(query.source) : "Google"
            const direction = await this.googleService.direction(query);
            return Helpers.sendJsonResponse({direction}, "Directions gotten successfully");
        } catch (error) {
            throw Error(error)
        }
    }
}
