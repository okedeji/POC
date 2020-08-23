import { Controller, Post, Body } from '@nestjs/common';

import { CustomerService } from './customer.service';
import { AppLogger } from '../../../common';
import { CustomerLocationDTO, Helpers, Response } from '../../../common/';

@Controller('customer')
export class CustomerController {
    constructor( 
        private readonly customerService: CustomerService,
        private readonly logger: AppLogger
    ){}

    @Post('/customer')
    async customerLocation(@Body() body: CustomerLocationDTO): Promise<Response> {
        try {
        const saved = await this.customerService.saveCustomerLocation(body)
        this.logger.log('Saved into the customer Locations DB')

        return Helpers.sendJsonResponse({ saved }, "saved customer location successfully");
        } catch (error) {
            throw Error(error);
        }
    }
}
