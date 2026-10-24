import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { RoomsService, CreateRoomDto } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async getAllRooms(@Query('userId') userId?: string) {
    return this.roomsService.getAllRooms(userId);
  }

  @Get(':slug')
  async getRoom(@Param('slug') slug: string) {
    return this.roomsService.getRoomBySlug(slug);
  }

  @Post()
  async createRoom(@Body() body: CreateRoomDto) {
    return this.roomsService.createRoom(body);
  }

  @Delete(':slug')
  async deleteRoom(
    @Param('slug') slug: string,
    @Query('userId') userId?: string
  ) {
    return this.roomsService.deleteRoom(slug, userId);
  }
}
