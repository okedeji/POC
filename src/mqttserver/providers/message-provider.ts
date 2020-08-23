import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MessageProvider {
    constructor(
        @Inject('MQTT_SERVICE') private client: ClientProxy,
    ){}

    emit(pattern: string, data: string): void {
        const message:string = typeof data == 'string'? data : JSON.stringify(data);
        this.client.emit(pattern.toLowerCase(), message);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    emitClientTrack(regNumber: string, data: any): void {
        this.emit(`client/track/${regNumber}`, data);
    }
    
}
