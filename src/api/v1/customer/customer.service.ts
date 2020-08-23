import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerLocation } from '@kobotech/geo-schema';

import { CustomerLocationDTO } from '../../../common/';

@Injectable()
export class CustomerService {

    constructor(
        @InjectModel('CustomerLocation') private readonly customerLocationModel: Model<CustomerLocation>
    ){}
    /**
     * Save customer pickup, wearhouse locations as PoI
     * @param  {CustomerLocationDTO} data
     * @returns Promise
     */
    async saveCustomerLocation (data: CustomerLocationDTO): Promise<CustomerLocation> {
        try {
            const toSave = {
                customerId : data.customer_id,
                customerName : data.customer_name,
                locationName : data.name,
                state : data.state,
                country : data.country,
                contactPhone : data.contact_phone,
                contactName : data.contact_name,
                geofenceRadius : data.radius,
                location : {
                    coordinates: [data.long, data.lat],
                    address: data.address,
                    geohash: data.geohash
                }
            }
            const nCustomerLocation = new this.customerLocationModel(toSave)

            const saved = await nCustomerLocation.save()

            return saved;
        } catch (error) {
            throw new Error(error)
        }
    }
}
