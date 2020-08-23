/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KafkaProvider } from '../../common/providers';
import { AppLogger } from '../../common/logger';
import { KafkaMessage } from 'src/common/classes';

export interface StreamingDate {
    bearing?: number,
    speed?: number,
    customerId?: number,
    driverId?: number,
    latitude: number,
    longitude:number,
    tripId: string,
    regNumber: string,
    address?: string
}

@Controller()
export class MessageControllerController {

    aggregatorTopic = 'GEOAggregator';

    constructor(
        private kafkProvider: KafkaProvider,
        private logger: AppLogger
    ){}

    @EventPattern('server/track/+')
    async handleServerTracking(@Payload() data: any) {
        // business logic
        this.logger.log(`streaming data from mobile ${data}`);
        data.source = "mobile";

        const message: KafkaMessage[] = [{
            key: 'mobile:track',
            value: JSON.stringify(data)
        }]
        this.kafkProvider.sendMessage(this.aggregatorTopic, message);
    }
    
    // sim tracker events for testing purpose
    @EventPattern('sim/tracker')
    async SimTrackTracking(@Payload() data: any){
        // business logic
        if(process.env.NODE_ENV.toLowerCase() == ("" || "live" || "production" || "master")){
            return "No sim in production";
        }
        this.logger.log(`streaming data from simulator ${data}`);

        const message: KafkaMessage[] = [{
            key: 'mobile:track',
            value: JSON.stringify(data)
        }];
        this.kafkProvider.sendMessage(this.aggregatorTopic, message);

        return;
    }
    
}
