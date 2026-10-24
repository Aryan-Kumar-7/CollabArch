import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { RoomsModule } from './rooms/rooms.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    WebhooksModule,
    GatewayModule,
    RoomsModule,
  ],
})
export class AppModule {}
