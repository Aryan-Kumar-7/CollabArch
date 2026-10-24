import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const devUserId = request.headers['x-user-id'];

    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.query?.token) {
      token = request.query.token as string;
    }

    // Support dev header override for local API testing without a live frontend session
    if (!token && devUserId && process.env.NODE_ENV !== 'production') {
      request.user = {
        userId: devUserId as string,
        email: (request.headers['x-user-email'] as string) || `${devUserId}@collabarch.internal`,
        userName: (request.headers['x-user-name'] as string) || 'Dev Architect',
        avatarUrl: null,
        isGuest: false,
      } as AuthenticatedUser;
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    try {
      const secretKey =
        process.env.CLERK_SECRET_KEY || 'sk_test_1OOaEIDnIHxhRluKj9r1EBnOVmmiC8fcwyZenhpm2y';
      const claims = await verifyToken(token, { secretKey });

      if (!claims || !claims.sub) {
        throw new UnauthorizedException('Invalid Clerk token payload');
      }

      request.user = {
        userId: claims.sub,
        orgId: (claims as any).org_id || null,
        orgRole: (claims as any).org_role || null,
        userName:
          (claims as any).name ||
          (claims as any).username ||
          (claims as any).email?.split('@')[0] ||
          'Architect',
        email: (claims as any).email,
        avatarUrl: (claims as any).picture || null,
        isGuest: false,
      } as AuthenticatedUser;

      return true;
    } catch (err: any) {
      this.logger.warn(`[ClerkAuthGuard] Token verification failed: ${err?.message || err}`);
      throw new UnauthorizedException(err?.message || 'Authentication token verification failed');
    }
  }
}
