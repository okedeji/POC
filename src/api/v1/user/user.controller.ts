import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';

import { UserService } from './user.service';
import { UserLocationDTO, Helpers, Response, UserLocationParam, UserLocationsQuery } from '../../../common/';

@Controller('user')
export class UserController {
    constructor( 
        private readonly userService: UserService,
    ){}

    @Post('/userLocation')
    async userLocation (@Body() body: UserLocationDTO): Promise<Response> {
        try {
        const user = await this.userService.saveUserLocation(body);
        if(user){
            return Helpers.sendJsonResponse({}, "User Location saved succefully");
        }
        return Helpers.sendErrorResponse({}, 'Unable to save User location', 'NOT_MODIFIED');
        } catch (error) {
        throw Error(error);
        }
    }

    @Get('/userLocation/:userId')
    async userLocationById (@Param() params: UserLocationParam): Promise<Response> {

        const location = await this.userService.getUserLocation(params.userId);
        if(location){
            return Helpers.sendJsonResponse({location}, "User location gotten successfully");
        }else{
        return Helpers.sendErrorResponse({}, 'Unable too get user location with this ID', 'NOT_FOUND');
        }
    }

    @Get('/userLocations')
    async userLocations (@Query() query: UserLocationsQuery): Promise<Response> {

        const locations = await this.userService.getUserLocations(query);
        
        return Helpers.sendJsonResponse({locations}, "Users locations gotten successfully");
    }
}
