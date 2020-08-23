import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Transport } from '@nestjs/microservices';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import * as compression from 'compression';
import * as path from 'path';
import * as morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import * as Sentry from '@sentry/node';

import { AppModule } from './app.module';
import { AppLogger } from './common/logger';
import { AllExceptionsFilter } from './common/helpers';
import { AuthGuard } from './common/guards/auth.guard';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import coreConfig from './common/config/config';
import mqttConfig from './common/config/mqtt.config';

async function bootstrap() {

  // create a rotating write stream
  const accessLogStream = createStream('access.log', {
    interval: '1d', // rotate daily
    path: path.join(path.dirname(__dirname), 'log')
  })
  

  const CONFIG = coreConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger()
  });
  Sentry.init({
    dsn: 'https://1e334862410a4e969776c6bf1adf3bf0@o222555.ingest.sentry.io/5389799',
  });
  const reflector = app.get( Reflector );
  app.useGlobalInterceptors(new SentryInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalGuards(new AuthGuard(reflector));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));
  app.use(compression());
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    })
  );
  // setup the logger
  app.use(morgan('combined', { stream: accessLogStream }));
  app.use(morgan('combined'));
  //TODO: there is a load balancer or reverse proxy. Express may need to be configured to trust the headers set by the proxy in order to get the correct IP for the end user
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.enableCors();

  app.connectMicroservice({
    transport: Transport.MQTT,
    options: {
        url: mqttConfig().url
    }
  });


  try {
    // quit on ctrl-c when running docker in terminal
    process.on('SIGINT', () => {
      console.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
      app.close();
    });

    // quit properly on docker stop
    process.on('SIGTERM', () => {
      console.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
      app.close();
    });
  } catch (e) {
    console.error(e);
  }

  await app.startAllMicroservicesAsync();
  await app.listen(CONFIG.port);
}
bootstrap();
