import { registerAs } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";

export default registerAs('kafka', () => ({
  option: (process.env.NODE_ENV.toLowerCase() == 'local') || (!process.env.NODE_ENV ) ?  {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: Array.from(process.env.KAFKA_BROKERS.split(',')), 
        ssl: true,
        sasl: {
          mechanism: 'plain',
          username: process.env.KAFKA_KEY,
          password: process.env.KAFKA_SECRET
        },
      },
    }
} :  {
    transport: Transport.KAFKA,
    options: {
        client: {
            brokers: Array.from(process.env.KAFKA_BROKERS.split(',')), 
            ssl: true,
        },
    }
}
}));