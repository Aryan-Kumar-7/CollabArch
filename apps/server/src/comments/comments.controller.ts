import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('rooms/:slug/comments')
  async getComments(@Param('slug') slug: string) {
    return this.commentsService.getComments(slug);
  }

  @Post('rooms/:slug/comments')
  @UseGuards(ClerkAuthGuard)
  async createComment(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto
  ) {
    return this.commentsService.createComment(slug, user.userId, dto);
  }

  @Patch('comments/:id')
  @UseGuards(ClerkAuthGuard)
  async updateComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommentDto
  ) {
    return this.commentsService.updateComment(id, user.userId, dto);
  }

  @Patch('comments/:id/resolve')
  @UseGuards(ClerkAuthGuard)
  async resolveComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.commentsService.updateComment(id, user.userId, { isResolved: true });
  }

  @Delete('comments/:id')
  @UseGuards(ClerkAuthGuard)
  async deleteComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.commentsService.deleteComment(id, user.userId);
  }
}
