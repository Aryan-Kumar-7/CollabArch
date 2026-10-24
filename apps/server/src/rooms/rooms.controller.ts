import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CanvasRoomMeta } from '@collabarch/shared-types';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  getAllRooms(): CanvasRoomMeta[] {
    return this.roomsService.getAllRooms();
  }

  @Get(':id')
  getRoom(@Param('id') id: string): CanvasRoomMeta {
    return this.roomsService.getRoom(id);
  }

  @Post()
  createRoom(@Body() body?: { name?: string; id?: string }): CanvasRoomMeta {
    return this.roomsService.createRoom(body?.name, body?.id);
  }
}
