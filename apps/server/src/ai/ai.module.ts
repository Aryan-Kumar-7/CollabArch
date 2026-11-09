import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { GatewayModule } from '../gateway/gateway.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GatewayModule, PrismaModule, AuthModule],
  providers: [AiService, AiRateLimitGuard],
  controllers: [AiController],
  exports: [AiService, AiRateLimitGuard],
})
export class AiModule {}

