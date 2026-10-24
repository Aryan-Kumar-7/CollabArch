import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<(Role | string)[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('User is not authenticated');
    }

    // Determine target workspace ID from request parameters, body, or query
    const workspaceId =
      request.params?.id ||
      request.params?.workspaceId ||
      request.body?.workspaceId ||
      request.query?.workspaceId;

    if (!workspaceId) {
      // If no specific workspace context in route, check token org role
      if (user.orgRole) {
        const userRole = user.orgRole.includes('admin') ? 'ADMIN' : 'MEMBER';
        if (requiredRoles.includes(userRole)) {
          return true;
        }
      }
      throw new ForbiddenException('Workspace context is required for role verification');
    }

    // Query WorkspaceMember from PostgreSQL
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      // Check if user has org token matching the workspace
      if (
        user.orgId === workspaceId &&
        user.orgRole?.includes('admin') &&
        requiredRoles.includes('ADMIN')
      ) {
        return true;
      }
      throw new ForbiddenException('User is not a member of this workspace');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `Insufficient permissions: required one of [${requiredRoles.join(', ')}], found ${membership.role}`
      );
    }

    return true;
  }
}
