import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TruckLocationSchema, TruckRequestSchema } from '@kobotech/geo-schema';

import { TruckController } from './truck.controller';
import { TruckService } from './truck.service';
import { CommonModule } from 'src/common';

@Module({
  imports: [
    MongooseModule.forFeature([
        { name: 'TruckLocation', schema: TruckLocationSchema },
        { name: 'TruckRequest', schema: TruckRequestSchema }
    ]),
    CommonModule
  ],
  exports: [TruckService],
  controllers: [TruckController],
  providers: [TruckService]
})
export class TruckModule {}
