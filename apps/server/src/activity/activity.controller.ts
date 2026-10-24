import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('workspaces/:workspaceId')
  @UseGuards(ClerkAuthGuard)
  async getWorkspaceActivity(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string
  ) {
    const take = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.activityService.getWorkspaceActivity(workspaceId, take);
  }

  @Get('rooms/:slug')
  async getRoomActivity(
    @Param('slug') slug: string,
    @Query('limit') limit?: string
  ) {
    const take = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.activityService.getRoomActivity(slug, take);
  }
}
