import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { KafkaProvider } from './providers';
import kafkaConfig from './config/kafka.config';
import { AppLogger } from './logger/logger'

@Module({
  imports: [
    ConfigModule.forFeature(kafkaConfig)
  ],
  exports: [ KafkaProvider, AppLogger ],
  providers: [ KafkaProvider, AppLogger ]
})
export class CommonModule {}
