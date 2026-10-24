export class RecordSimulationDto {
  title?: string;
  trafficRps!: number;
  p99LatencyMs!: number;
  errorRate!: number;
  bottleneckNodeId?: string;
  metricsSnapshot?: any;
}
