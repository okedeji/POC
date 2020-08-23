import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeocodedSchema } from '@kobotech/geo-schema';

import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Geocoded', schema: GeocodedSchema }
    ])
  ],
  exports: [ GoogleService ],
  controllers: [GoogleController],
  providers: [GoogleService]
})
export class GoogleModule {}
