import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[CollabArch Server] Running on http://localhost:${port}`);
}

bootstrap();
