import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TruckLocationSchema, KobocareStationSchema, CustomerLocationSchema, UserLocationSchema, LocationHistorySchema, TruckRequestSchema, TripHistorySchema } from '@kobotech/geo-schema';

import { CorelocationController } from './corelocation.controller';
import { CommonModule } from '../../../common';
import { MqttserverModule } from 'src/mqttserver';
import { CorelocationService } from './corelocation.service';
import { GoogleModule } from '../google/google.module';
import { TruckModule } from '../truck/truck.module';

@Module({
  imports: [
    CommonModule,
    GoogleModule,
    TruckModule,
    MqttserverModule,
    MongooseModule.forFeature([
      { name: 'TruckLocation', schema: TruckLocationSchema },
      { name: 'KobocareStation', schema: KobocareStationSchema },
      { name: 'CustomerLocation', schema: CustomerLocationSchema },
      { name: 'UserLocation', schema: UserLocationSchema },
      { name: 'LocationHistory', schema: LocationHistorySchema },
      { name: 'TruckRequest', schema: TruckRequestSchema },
      { name: 'TripHistory', schema: TripHistorySchema }

    ])
  ],
  exports: [ CorelocationService ],
  controllers: [CorelocationController],
  providers: [CorelocationService]
})
export class CorelocationModule {}
