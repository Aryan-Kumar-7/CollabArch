import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { AiService, ArchitectureResponse } from './ai.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

export class GenerateArchitectureDto {
  prompt!: string;
  roomId?: string;
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
}

