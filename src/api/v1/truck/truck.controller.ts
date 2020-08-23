import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';

import { TruckService } from './truck.service';
import { AppLogger } from '../../../common';
import { TruckRequestDTO, Helpers, Response, CongestionParam, CreateTruckDTO, User } from '../../../common/';

@Controller('truck')
export class TruckController {

    constructor(
        private readonly truckService: TruckService,
        private readonly logger: AppLogger
    ){}

    @Post('/truckRequest')
    async truckRequest(@Body() body: TruckRequestDTO): Promise<Response> {
        try {
            const saved = await this.truckService.saveTruckRequest(body)
            this.logger.log('Saved into the Truck Request DB')

            return Helpers.sendJsonResponse({ saved }, "saved Truck request successfully");
        } catch (error) {
            throw Error(error);
        }
    }

    @Get('/truck/:regNumber')
    async truck (@Param() params: CongestionParam ): Promise<Response> {
        const truck = await this.truckService.getTruckByRegNumber(params.regNumber);
    
        return Helpers.sendJsonResponse({truck}, "Truck gotten succesfully");
    }

    @Post('/createTruck')
    async createTruck (@Body() body: CreateTruckDTO): Promise<Response> {
        body.regNumber = body.regNumber.toUpperCase();
        try {
        const saved = await this.truckService.createTruck(body)
        if(!saved) {
            this.logger.log('unable to save Truck into tthe DB')
            return Helpers.sendErrorResponse({}, 'unable to save Truck into tthe DB', 'NOT_MODIFIED');
        }

        this.logger.log('Saved Truck into tthe DB')
        return Helpers.sendJsonResponse({saved}, "saved Truck successfully");
        } catch (error) {
        throw Error(error);
        }
    }

    @Put('/bookTruck/:regNumber')
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async book(@Param() params: CongestionParam, @User() user): Promise<Response> {
        const regNumber = params.regNumber.toUpperCase();
        const updated = await this.truckService.bookTruck(regNumber, user);
        if(updated) {
          return Helpers.sendJsonResponse({}, "Truck booked successfully");
        }
        return Helpers.sendErrorResponse({}, 'Unable to book truck', 'BAD_REQUEST')
    }

    @Get('/bookedTrucks')
    async allBookedTrucks (): Promise<Response> {
        const truck = await this.truckService.getAllBooked();
    
        return Helpers.sendJsonResponse({truck}, "Booked Truck gotten succesfully");
    }
}
