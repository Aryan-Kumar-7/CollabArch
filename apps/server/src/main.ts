import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

import * as path from 'path';
import * as fs from 'fs';

// Ensure .env is loaded reliably across monorepo and turbo execution roots
for (const envPath of [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/server/.env'),
]) {
  try {
    if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
      (process as any).loadEnvFile(envPath);
      break;
    }
  } catch {}
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
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
