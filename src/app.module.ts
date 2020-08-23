import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonModule } from './common/common.module';
import { ApiModule } from './api/api.module';
import { MqttserverModule } from './mqttserver/mqttserver.module';
import config from './common/config/config';
import databaseConfig from './common/config/database.config';
import kafkaConfig from './common/config/kafka.config';
import mqttConfig from './common/config/mqtt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config, databaseConfig, kafkaConfig, mqttConfig ],
    }),
    MongooseModule.forRoot(databaseConfig().dbUrl),
    CommonModule,
    ApiModule,
    MqttserverModule
  ]
})
export class AppModule {}
