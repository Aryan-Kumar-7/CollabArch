import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { AiService, ArchitectureResponse, WhiteboardResponse } from './ai.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import {
  CanvasNode,
  CanvasEdge,
  ArchitectureReviewResult,
  AutoTuneTelemetry,
  AutoTuneAdjustment,
  AutoTuneResult,
} from '@collabarch/shared-types';

export class GenerateArchitectureDto {
  prompt!: string;
  roomId?: string;
}

export class ReviewArchitectureDto {
  nodes!: CanvasNode[];
  edges!: CanvasEdge[];
  roomId?: string;
}

export class AutoTuneCapacityDto {
  nodes!: CanvasNode[];
  edges!: CanvasEdge[];
  telemetry!: AutoTuneTelemetry;
  roomId?: string;
}

export class ApplyAutoTuneDto {
  roomId!: string;
  adjustments!: AutoTuneAdjustment[];
}

@Controller('ai')
@UseGuards(ClerkAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-architecture')
  async generateArchitecture(
    @Body() body: GenerateArchitectureDto
  ): Promise<ArchitectureResponse> {
    if (!body?.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
      throw new BadRequestException('Prompt description is required');
    }

    return this.aiService.generateArchitecture(body.prompt.trim(), body.roomId);
  }

  @Post('generate-whiteboard')
  async generateWhiteboard(
    @Body() body: GenerateArchitectureDto
  ): Promise<WhiteboardResponse> {
    if (!body?.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
      throw new BadRequestException('Prompt description is required');
    }

    return this.aiService.generateWhiteboardDiagram(body.prompt.trim(), body.roomId);
  }

  @Post('review-architecture')
  async reviewArchitecture(
    @Body() body: ReviewArchitectureDto
  ): Promise<ArchitectureReviewResult> {
    if (!body?.nodes || !Array.isArray(body.nodes) || body.nodes.length === 0) {
      throw new BadRequestException('At least one canvas node is required to review.');
    }

    return this.aiService.reviewArchitecture(body.nodes, body.edges || [], body.roomId);
  }

  @Post('auto-tune')
  async autoTuneCapacity(
    @Body() body: AutoTuneCapacityDto
  ): Promise<AutoTuneResult> {
    if (!body?.nodes || !Array.isArray(body.nodes) || body.nodes.length === 0) {
      throw new BadRequestException('At least one canvas node is required to auto-tune.');
    }

    if (!body?.telemetry) {
      throw new BadRequestException('Simulation telemetry is required to auto-tune.');
    }

    return this.aiService.autoTuneCapacity(
      {
        nodes: body.nodes,
        edges: body.edges || [],
        telemetry: body.telemetry,
      },
      body.roomId
    );
  }

  @Post('apply-auto-tune')
  async applyAutoTune(
    @Body() body: ApplyAutoTuneDto
  ): Promise<{ success: boolean; updatedCount: number }> {
    if (!body?.roomId) {
      throw new BadRequestException('roomId is required to apply auto-tune updates.');
    }
    if (!body?.adjustments || !Array.isArray(body.adjustments)) {
      throw new BadRequestException('adjustments array is required to apply auto-tune updates.');
    }

    await this.aiService.syncAdjustmentsToRoom(body.roomId, body.adjustments);
    return { success: true, updatedCount: body.adjustments.length };
  }
}



