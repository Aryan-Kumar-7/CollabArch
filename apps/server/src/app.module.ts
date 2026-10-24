import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { RoomsModule } from './rooms/rooms.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, RedisModule, GatewayModule, RoomsModule],
})
export class AppModule {}

