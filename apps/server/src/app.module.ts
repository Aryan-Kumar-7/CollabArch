import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [GatewayModule, RoomsModule],
})
export class AppModule {}
