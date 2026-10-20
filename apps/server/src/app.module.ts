import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { RoomsModule } from './rooms/rooms.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [RedisModule, GatewayModule, RoomsModule],
})
export class AppModule {}
