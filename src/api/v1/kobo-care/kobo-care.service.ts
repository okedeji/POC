import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Geohasher } from '@kobotech/corelocation';
import { KobocareStation } from '@kobotech/geo-schema';

import { KobocareStationDTO } from '../../../common';

@Injectable()
export class KoboCareService {
    constructor(
        @InjectModel('KobocareStation') private readonly kobocareStationModel: Model<KobocareStation>
    ){}
    /**
     * Save Kobocare station as a PoI
     * @param  {KobocareStationDTO} data
     * @returns Promise
     */
    async saveKobocareStation (data: KobocareStationDTO): Promise<KobocareStation> {
        try {

            const found = await this.kobocareStationModel.findOne({stationId: data.stationId})
            if(found && found._id){
                throw Error("kobocare station already exists")
            }
            const toSave = {
                vendorId: data.vendorId,
                vendorName: data.vendorName,
                stationId: data.stationId,
                stationName: data.name,
                state: data.state,
                address: data.address,
                country: data.country,
                location: {
                    address: data.address,
                    coordinates: [data.lng, data.lat],
                    geohash: Geohasher.encode(data.lat, data.lng, 7).geohash
                }
            }
            
            const nKobocareStation = await new this.kobocareStationModel(toSave);

            const saved = await nKobocareStation.save()

            return saved;
        } catch (error) {
            throw new Error(error)
        }
    }
}
