import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import mqttConfig from '../common/config/mqtt.config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MessageProvider } from './providers/message-provider';
import { MessageControllerController } from './message-controller/message-controller.controller';
import { CommonModule } from '../common';

@Module({
    imports:[
        CommonModule,
        ConfigModule.forFeature(mqttConfig),
        ClientsModule.register([
            {
                name: 'MQTT_SERVICE',
                transport: Transport.MQTT,
                options: {
                    url: mqttConfig().url
                }
            },
        ]),
    ],
    exports: [ MessageProvider ],
    providers: [MessageProvider],
    controllers: [MessageControllerController]
})
export class MqttserverModule {}
