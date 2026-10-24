import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RevisionsService } from './revisions.service';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller()
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  @Get('rooms/:slug/revisions')
  async getRevisions(@Param('slug') slug: string) {
    return this.revisionsService.getRevisions(slug);
  }

  @Post('rooms/:slug/revisions')
  @UseGuards(ClerkAuthGuard)
  async createRevision(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRevisionDto
  ) {
    return this.revisionsService.createRevision(slug, user.userId, dto);
  }

  @Get('revisions/:id')
  async getRevisionById(@Param('id') id: string) {
    return this.revisionsService.getRevisionById(id);
  }

  @Post('revisions/:id/restore')
  @UseGuards(ClerkAuthGuard)
  async restoreRevision(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.revisionsService.restoreRevision(id, user.userId);
  }
}
