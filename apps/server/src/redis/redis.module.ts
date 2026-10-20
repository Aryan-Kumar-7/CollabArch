import { Module, Global, Provider } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from './redis.constants';
import { RedisPubSubService } from './redis-pubsub.service';

function createRedisOptions(): RedisOptions {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: false,
    maxRetriesPerRequest: 5,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    enableReadyCheck: true,
  };
}

const redisPubProvider: Provider = {
  provide: REDIS_PUB_CLIENT,
  useFactory: (): Redis => {
    if (process.env.REDIS_URL) {
      return new Redis(process.env.REDIS_URL, createRedisOptions());
    }
    return new Redis(createRedisOptions());
  },
};

const redisSubProvider: Provider = {
  provide: REDIS_SUB_CLIENT,
  useFactory: (): Redis => {
    if (process.env.REDIS_URL) {
      return new Redis(process.env.REDIS_URL, createRedisOptions());
    }
    return new Redis(createRedisOptions());
  },
};

@Global()
@Module({
  providers: [redisPubProvider, redisSubProvider, RedisPubSubService],
  exports: [REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisPubSubService],
})
export class RedisModule {}
