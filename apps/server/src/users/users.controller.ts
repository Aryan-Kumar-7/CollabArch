import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SyncUserDto } from './dto/sync-user.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Provisions or updates the Clerk user in PostgreSQL.
   * Can be called directly with user payload or with Clerk JWT Bearer token.
   */
  @Post('sync')
  async syncUser(
    @Body() dto: SyncUserDto,
    @CurrentUser() authUser?: AuthenticatedUser
  ) {
    const id = dto?.id || authUser?.userId;
    if (!id) {
      throw new Error('User id is required in request body or authentication context');
    }

    const email = dto?.email || authUser?.email || `${id}@collabarch.internal`;
    const name = dto?.name || authUser?.userName || 'Architect';
    const avatarUrl = dto?.avatarUrl || authUser?.avatarUrl || undefined;

    return this.usersService.syncUser({ id, email, name, avatarUrl });
  }

  /**
   * Returns current authenticated user's profile, owned rooms, and active workspaces.
   */
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.usersService.getCurrentUser(user.userId);
    } catch {
      // Auto-provision if user record does not exist yet
      return this.usersService.syncUser({
        id: user.userId,
        email: user.email || `${user.userId}@collabarch.internal`,
        name: user.userName || 'Architect',
        avatarUrl: user.avatarUrl || undefined,
      });
    }
  }
}
