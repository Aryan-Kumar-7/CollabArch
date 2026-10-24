import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SimulationsService } from './simulations.service';
import { RecordSimulationDto } from './dto/record-simulation.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller()
export class SimulationsController {
  constructor(private readonly simulationsService: SimulationsService) {}

  @Get('rooms/:slug/simulations')
  async getSimulations(@Param('slug') slug: string) {
    return this.simulationsService.getSimulations(slug);
  }

  @Post('rooms/:slug/simulations')
  @UseGuards(ClerkAuthGuard)
  async recordSimulation(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordSimulationDto
  ) {
    return this.simulationsService.recordSimulation(slug, user.userId, dto);
  }

  @Get('simulations/:id')
  async getSimulationById(@Param('id') id: string) {
    return this.simulationsService.getSimulationById(id);
  }
}
