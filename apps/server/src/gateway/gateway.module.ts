import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { RoomManagerService } from './room-manager.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [CanvasGateway, RoomManagerService],
  exports: [CanvasGateway, RoomManagerService],
})
export class GatewayModule {}
