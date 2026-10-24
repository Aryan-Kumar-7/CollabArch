import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  /**
   * Processes verified Clerk webhook events and synchronizes them to PostgreSQL
   */
  async handleClerkEvent(event: any) {
    const eventType: string = event?.type;
    const data: any = event?.data;

    this.logger.log(`[WebhooksService] Received Clerk webhook event: ${eventType}`);

    if (!data) {
      return { success: false, message: 'Missing event payload data' };
    }

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const id = data.id;
        const email =
          data.email_addresses?.[0]?.email_address ||
          data.primary_email_address_id ||
          `${id}@collabarch.internal`;
        const name =
          [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
          data.username ||
          email.split('@')[0] ||
          'Architect';
        const avatarUrl = data.image_url || data.profile_image_url || null;

        await this.usersService.syncUser({ id, email, name, avatarUrl });
        this.logger.log(`[WebhooksService] Synced user ${id} (${email}) from Clerk`);
        return { success: true, event: eventType, userId: id };
      }

      case 'organization.created':
      case 'organization.updated': {
        const orgId = data.id;
        const orgName = data.name || 'Team Workspace';
        const orgSlug = data.slug || `org-${orgId.slice(0, 8)}`;
        const createdBy = data.created_by;

        const workspace = await this.prisma.workspace.upsert({
          where: { id: orgId },
          update: {
            name: orgName,
            slug: orgSlug,
            clerkOrgId: orgId,
          },
          create: {
            id: orgId,
            name: orgName,
            slug: orgSlug,
            clerkOrgId: orgId,
          },
        });

        if (createdBy && eventType === 'organization.created') {
          // Ensure creator exists in User table
          await this.prisma.user.upsert({
            where: { id: createdBy },
            update: {},
            create: {
              id: createdBy,
              email: `${createdBy}@collabarch.internal`,
              name: 'Workspace Creator',
            },
          });

          await this.prisma.workspaceMember.upsert({
            where: {
              userId_workspaceId: {
                userId: createdBy,
                workspaceId: orgId,
              },
            },
            update: { role: 'ADMIN' },
            create: {
              userId: createdBy,
              workspaceId: orgId,
              role: 'ADMIN',
            },
          });
        }

        this.logger.log(
          `[WebhooksService] Synced workspace ${workspace.name} (${workspace.id}) from Clerk`
        );
        return { success: true, event: eventType, workspaceId: workspace.id };
      }

      case 'organizationMembership.created':
      case 'organizationMembership.updated': {
        const orgId = data.organization?.id;
        const publicUserData = data.public_user_data;
        const memberUserId = publicUserData?.user_id;
        const role = data.role?.toLowerCase()?.includes('admin') ? 'ADMIN' : 'MEMBER';

        if (!orgId || !memberUserId) {
          this.logger.warn('[WebhooksService] Organization membership event missing orgId or userId');
          return { success: false, message: 'Missing orgId or userId' };
        }

        // Ensure user exists
        const userName =
          [publicUserData.first_name, publicUserData.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          publicUserData.identifier ||
          'Team Member';
        const userEmail = publicUserData.identifier || `${memberUserId}@collabarch.internal`;

        await this.prisma.user.upsert({
          where: { id: memberUserId },
          update: {
            name: userName,
            avatarUrl: publicUserData.image_url || null,
          },
          create: {
            id: memberUserId,
            name: userName,
            email: userEmail,
            avatarUrl: publicUserData.image_url || null,
          },
        });

        // Ensure workspace exists
        await this.prisma.workspace.upsert({
          where: { id: orgId },
          update: {},
          create: {
            id: orgId,
            name: data.organization.name || 'Team Workspace',
            slug: data.organization.slug || `org-${orgId.slice(0, 8)}`,
            clerkOrgId: orgId,
          },
        });

        // Upsert workspace member
        await this.prisma.workspaceMember.upsert({
          where: {
            userId_workspaceId: {
              userId: memberUserId,
              workspaceId: orgId,
            },
          },
          update: { role },
          create: {
            userId: memberUserId,
            workspaceId: orgId,
            role,
          },
        });

        this.logger.log(
          `[WebhooksService] Synced organization membership for user ${memberUserId} in org ${orgId} with role ${role}`
        );
        return { success: true, event: eventType, userId: memberUserId, workspaceId: orgId };
      }

      case 'organizationMembership.deleted': {
        const orgId = data.organization?.id;
        const memberUserId = data.public_user_data?.user_id;

        if (orgId && memberUserId) {
          await this.prisma.workspaceMember.deleteMany({
            where: {
              userId: memberUserId,
              workspaceId: orgId,
            },
          });
          this.logger.log(
            `[WebhooksService] Removed workspace membership for user ${memberUserId} from org ${orgId}`
          );
        }
        return { success: true, event: eventType };
      }

      default:
        this.logger.debug(`[WebhooksService] Unhandled Clerk webhook event: ${eventType}`);
        return { success: true, unhandled: true, event: eventType };
    }
  }
}
