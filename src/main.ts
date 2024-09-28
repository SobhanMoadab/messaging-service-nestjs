import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestFactory } from '@nestjs/core';
import { RedisIoAdapter } from './redis-io-adapter'; // Adjust this path as necessary

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Set up microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>('RABBITMQ_URL')],
      queue: 'messaging_queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  // Set up Redis adapter for WebSocket
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Set up HTTP listener
  await app.startAllMicroservices();
  await app.listen(configService.get<number>('MESSAGING_SERVICE_PORT') || 3001);
}
bootstrap();
