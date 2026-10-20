import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';

@Module({
  providers: [CanvasGateway],
  exports: [CanvasGateway],
})
export class GatewayModule {}
