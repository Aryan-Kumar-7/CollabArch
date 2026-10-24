import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('workspaces')
@UseGuards(ClerkAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /**
   * GET /workspaces: Returns all workspaces where current user is a member or admin
   */
  @Get()
  async getUserWorkspaces(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.getUserWorkspaces(user.userId);
  }

  /**
   * POST /workspaces: Creates a new workspace and sets creator as ADMIN
   */
  @Post()
  async createWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto
  ) {
    return this.workspacesService.createWorkspace(user.userId, dto);
  }

  /**
   * GET /workspaces/:id/rooms: Returns all architecture rooms in the workspace
   */
  @Get(':id/rooms')
  async getWorkspaceRooms(
    @Param('id') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.workspacesService.getWorkspaceRooms(workspaceId, user.userId);
  }

  /**
   * POST /workspaces/:id/members: Invites or assigns a member to the workspace (Enforces ADMIN role)
   */
  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async addMember(
    @Param('id') workspaceId: string,
    @Body() dto: InviteMemberDto
  ) {
    return this.workspacesService.addMember(workspaceId, dto.email, dto.role);
  }
}
