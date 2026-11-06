import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ForbiddenException, UseGuards } from '@nestjs/common';
import { RoomsService, CreateRoomDto } from './rooms.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async getAllRooms(
    @Query('userId') userId?: string,
    @Query('workspaceId') workspaceId?: string
  ) {
    return this.roomsService.getAllRooms(userId, workspaceId);
  }

  @Get(':slug')
  async getRoom(@Param('slug') slug: string) {
    return this.roomsService.getRoomBySlug(slug);
  }

  @Post()
  async createRoom(@Body() body: CreateRoomDto) {
    return this.roomsService.createRoom(body);
  }

  @Patch(':slug/visibility')
  async updateVisibility(
    @Param('slug') slug: string,
    @Body() body: { visibility: 'PUBLIC_LINK' | 'WORKSPACE' | 'PRIVATE'; userId?: string },
    @CurrentUser() authUser?: AuthenticatedUser
  ) {
    const userId = body.userId || authUser?.userId;
    if (!userId) {
      throw new ForbiddenException('User authentication required to update room visibility');
    }
    return this.roomsService.updateVisibility(slug, body.visibility, userId);
  }

  @Delete(':slug')
  @UseGuards(ClerkAuthGuard)
  async deleteRoom(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.roomsService.deleteRoom(slug, user.userId);
  }
}
