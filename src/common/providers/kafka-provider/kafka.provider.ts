import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { KafkaOptions } from '@nestjs/microservices';
import { Producer, Kafka, KafkaConfig, CompressionTypes } from 'kafkajs';

import kafkaConfig from '../../config/kafka.config';
import { AppLogger } from '../../logger';

export interface KafkaMessage {
    value: string | Buffer,
    key: string
}

@Injectable()
export class KafkaProvider implements OnModuleDestroy {
    private _kafka: Kafka;
    private _producer: Producer;
    private config: KafkaConfig;

    constructor(
        private readonly logger: AppLogger
    ) {
        logger.log('Initializing kafka admin');
        const config: any = this.getKafkaOption().options.client; 
        this.config = config;

        this._kafka = new Kafka(this.config);
        this._producer = this._kafka.producer();
    }
    
    onModuleDestroy(): void {
        this.disconnect(); // connections are closed
    }


    sendMessage(topic: string, messages: KafkaMessage[]): void{
        this.connect().then(() => {
            this._producer.send({
                topic,
                compression: CompressionTypes.GZIP,
                messages: messages
            }).then(() => {
                console.log('message sent');
            }).catch(error => {
                console.log(error);
                throw(error);
            }).finally(() => {
                this.disconnect();
            })
        });
    }

    private async connect(): Promise<void> {
        await this._producer.connect();
    }

    private async disconnect(): Promise<void> {
        await this._producer.disconnect();
    }

    private getKafkaOption(): KafkaOptions {
        const KAFKA_OPTION: any = kafkaConfig().option;
        return KAFKA_OPTION;
    }
}
