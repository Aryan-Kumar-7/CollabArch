import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { RoomManagerService } from './room-manager.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [CanvasGateway, RoomManagerService],
  exports: [CanvasGateway, RoomManagerService],
})
export class GatewayModule {}

