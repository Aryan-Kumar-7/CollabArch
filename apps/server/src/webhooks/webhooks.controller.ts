import {
  Controller,
  Post,
  Req,
  Headers,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /webhooks/clerk
   * Ingests and verifies Clerk Svix webhook events.
   */
  @Post('clerk')
  async handleClerkWebhook(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Body() body: any
  ) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    let event: any = body;

    if (webhookSecret) {
      const svixId = headers['svix-id'];
      const svixTimestamp = headers['svix-timestamp'];
      const svixSignature = headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        this.logger.warn('[WebhooksController] Missing Svix signature headers');
        throw new BadRequestException('Missing Svix signature headers');
      }

      try {
        const wh = new Webhook(webhookSecret);
        // Use rawBody if populated by NestJS rawBody option, otherwise fallback to stringified body
        const rawPayload = (req as any).rawBody
          ? (req as any).rawBody.toString('utf8')
          : typeof body === 'string'
            ? body
            : JSON.stringify(body);

        event = wh.verify(rawPayload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err: any) {
        this.logger.error(
          `[WebhooksController] Svix signature verification failed: ${err?.message || err}`
        );
        throw new BadRequestException('Invalid webhook signature');
      }
    } else {
      this.logger.debug(
        '[WebhooksController] CLERK_WEBHOOK_SECRET is not configured; payload processed directly'
      );
    }

    return this.webhooksService.handleClerkEvent(event);
  }
}
