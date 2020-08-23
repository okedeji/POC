import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KobocareStationSchema } from '@kobotech/geo-schema';

import { KoboCareController } from './kobo-care.controller';
import { KoboCareService } from './kobo-care.service';
import { CommonModule } from 'src/common';


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'KobocareStation', schema: KobocareStationSchema }
        ]),
        CommonModule
    ],
    controllers: [KoboCareController],
    providers: [KoboCareService]
})
export class KoboCareModule {}
