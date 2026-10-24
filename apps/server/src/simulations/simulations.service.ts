import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { RecordSimulationDto } from './dto/record-simulation.dto';

@Injectable()
export class SimulationsService {
  private readonly logger = new Logger(SimulationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService
  ) {}

  /**
   * Persists a simulation benchmark report for a canvas room
   */
  async recordSimulation(roomSlug: string, userId: string, dto: RecordSimulationDto) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomSlug },
    });

    if (!room) {
      throw new NotFoundException(`Room "${roomSlug}" not found`);
    }

    // Ensure the runner User record exists
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@collabarch.internal`,
        name: 'Simulation Architect',
      },
    });

    const title =
      dto.title?.trim() ||
      `Simulation Run @ ${dto.trafficRps.toLocaleString()} RPS`;

    const simulation = await this.prisma.simulationRun.create({
      data: {
        roomId: room.id,
        userId,
        title,
        trafficRps: dto.trafficRps,
        p99LatencyMs: dto.p99LatencyMs,
        errorRate: dto.errorRate,
        bottleneckNodeId: dto.bottleneckNodeId || null,
        metricsSnapshot: dto.metricsSnapshot || undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    this.logger.log(
      `[SimulationsService] Recorded simulation "${simulation.title}" (${simulation.id}) for room "${roomSlug}"`
    );

    // Audit log
    await this.activityService.log({
      workspaceId: room.workspaceId,
      roomId: room.id,
      userId,
      action: 'SIMULATION_RECORDED',
      details: {
        simulationId: simulation.id,
        trafficRps: simulation.trafficRps,
        p99LatencyMs: simulation.p99LatencyMs,
        errorRate: simulation.errorRate,
        bottleneckNodeId: simulation.bottleneckNodeId,
      },
    });

    return simulation;
  }

  /**
   * Returns all recorded benchmark runs for a room
   */
  async getSimulations(roomSlug: string) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomSlug },
    });

    if (!room) {
      throw new NotFoundException(`Room "${roomSlug}" not found`);
    }

    return this.prisma.simulationRun.findMany({
      where: { roomId: room.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves single simulation benchmark report with full telemetry snapshot
   */
  async getSimulationById(id: string) {
    const simulation = await this.prisma.simulationRun.findUnique({
      where: { id },
      include: {
        room: {
          select: { id: true, slug: true, title: true },
        },
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!simulation) {
      throw new NotFoundException(`Simulation report "${id}" not found`);
    }

    return simulation;
  }
}
