import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('[PrismaService] Connected to PostgreSQL database');
        return;
      } catch (err: any) {
        retries -= 1;
        this.logger.warn(
          `[PrismaService] PostgreSQL connection attempt failed (${err?.message || err}). Retries remaining: ${retries}`
        );
        if (retries === 0) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('[PrismaService] Disconnected from PostgreSQL database');
  }
}
