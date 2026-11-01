import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AiService, ArchitectureResponse } from './ai.service';

export class GenerateArchitectureDto {
  prompt!: string;
  roomId?: string;
}

@Controller('ai')
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

