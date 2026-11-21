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

// Sanitize cloud dashboard environment variables (strip variable name prefixes & extra quotes)
for (const key of Object.keys(process.env)) {
  const val = process.env[key];
  if (typeof val === 'string') {
    let clean = val.trim();
    const prefixRegex = new RegExp(`^${key}\\s*=\\s*`, 'i');
    clean = clean.replace(prefixRegex, '').trim();
    clean = clean.replace(/^["']|["']$/g, '').trim();
    clean = clean.replace(/^["']|["']$/g, '').trim();
    process.env[key] = clean;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  const rawOrigins = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile apps, or same-origin)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.useWebSocketAdapter(new WsAdapter(app));

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[CollabArch Server] Running on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('[CollabArch Server] Fatal Bootstrap Error:', err);
  process.exit(1);
});
