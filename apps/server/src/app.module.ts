import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { RoomsModule } from './rooms/rooms.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ActivityModule } from './activity/activity.module';
import { RevisionsModule } from './revisions/revisions.module';
import { CommentsModule } from './comments/comments.module';
import { SimulationsModule } from './simulations/simulations.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    ActivityModule,
    UsersModule,
    WorkspacesModule,
    WebhooksModule,
    RevisionsModule,
    CommentsModule,
    SimulationsModule,
    GatewayModule,
    RoomsModule,
  ],
})
export class AppModule {}
