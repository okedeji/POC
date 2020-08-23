import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerLocationSchema } from '@kobotech/geo-schema';

import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CommonModule } from 'src/common';

@Module({
  imports: [
    MongooseModule.forFeature([
        { name: 'CustomerLocation', schema: CustomerLocationSchema }
    ]),
    CommonModule
  ],
  controllers: [CustomerController],
  providers: [CustomerService]
})
export class CustomerModule {}
