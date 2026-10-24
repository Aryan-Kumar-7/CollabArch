import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { RoomsService, CreateRoomDto } from './rooms.service';

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
    @Body() body: { visibility: 'PUBLIC_LINK' | 'WORKSPACE' | 'PRIVATE'; userId?: string }
  ) {
    return this.roomsService.updateVisibility(slug, body.visibility, body.userId);
  }

  @Delete(':slug')
  async deleteRoom(
    @Param('slug') slug: string,
    @Query('userId') userId?: string
  ) {
    return this.roomsService.deleteRoom(slug, userId);
  }
}
