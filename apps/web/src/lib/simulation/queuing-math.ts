/**
 * CollabArch Queuing Theory & Mathematical Modeling Utilities
 * Implements Poisson distributions, Box-Muller Gaussian jitter, Little's Law,
 * and M/M/1/K finite buffer drop-tail probability formulas.
 */

/**
 * Standard Box-Muller transform for generating standard normally distributed random numbers N(0, 1)
 */
export function randomGaussian(mean = 0, stdev = 1): number {
  let u1 = 0;
  let u2 = 0;
  // Ensure non-zero random values
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdev;
}

/**
 * Sample Poisson distributed arrival count for rate lambda over interval deltaSeconds.
 * 
 * P(K = k) = (lambda * deltaSeconds)^k * exp(-lambda * deltaSeconds) / k!
 * 
 * Uses Knuth's algorithm for small mean arrivals (< 30) and Box-Muller Gaussian
 * approximation for high throughput rates (>= 30).
 */
export function samplePoissonArrivals(rateRps: number, deltaSeconds: number): number {
  if (rateRps <= 0 || deltaSeconds <= 0) return 0;

  const expectedArrivals = rateRps * deltaSeconds;

  // Knuth's algorithm for small expected arrivals
  if (expectedArrivals < 30) {
    const l = Math.exp(-expectedArrivals);
    let k = 0;
    let p = 1.0;

    do {
      k++;
      p *= Math.random();
    } while (p > l);

    return Math.max(0, k - 1);
  }

  // Gaussian approximation with continuity correction for large lambda
  const stdDev = Math.sqrt(expectedArrivals);
  const sample = randomGaussian(expectedArrivals, stdDev);
  return Math.max(0, Math.round(sample));
}

/**
 * Generate inter-arrival time according to an exponential distribution Exp(lambda)
 * Delta_t = -ln(1 - U) / lambda
 */
export function sampleExponentialInterArrival(lambdaRps: number): number {
  if (lambdaRps <= 0) return Infinity;
  const u = Math.random();
  return -Math.log(1 - u) / lambdaRps;
}

/**
 * Sample node processing time with standard deviation jitter (typically 15% of base latency)
 * Modeled as T_proc ~ max(1, N(baseLatencyMs, (0.15 * baseLatencyMs)^2))
 */
export function sampleProcessingLatency(baseLatencyMs: number, jitterRatio = 0.15): number {
  if (baseLatencyMs <= 0) return 1;
  const stdev = Math.max(1, baseLatencyMs * jitterRatio);
  const latency = randomGaussian(baseLatencyMs, stdev);
  return Math.max(1, Math.round(latency));
}

/**
 * Computes theoretical drop probability for an M/M/1/K queue with finite buffer capacity K
 * 
 * Traffic intensity: rho = lambda / mu
 * Loss probability:
 *   P_loss = (1 - rho) * rho^K / (1 - rho^(K + 1))  if rho != 1
 *   P_loss = 1 / (K + 1)                            if rho == 1
 */
export function computeTheoreticalDropProbability(
  arrivalRateLambda: number,
  serviceRateMu: number,
  queueCapacityK: number
): number {
  if (queueCapacityK <= 0) return 1.0;
  if (serviceRateMu <= 0) return 1.0;
  if (arrivalRateLambda <= 0) return 0.0;

  const rho = arrivalRateLambda / serviceRateMu;

  if (Math.abs(rho - 1.0) < 1e-6) {
    return 1.0 / (queueCapacityK + 1);
  }

  const rhoPowerK = Math.pow(rho, queueCapacityK);
  const rhoPowerKPlus1 = rhoPowerK * rho;

  return ((1.0 - rho) * rhoPowerK) / (1.0 - rhoPowerKPlus1);
}

/**
 * Compute theoretical average queuing delay using Little's Law:
 * W_q = L_q / lambda
 */
export function computeTheoreticalQueuingDelayMs(
  arrivalRateLambda: number,
  serviceRateMu: number
): number {
  if (arrivalRateLambda <= 0 || serviceRateMu <= 0) return 0;
  const rho = arrivalRateLambda / serviceRateMu;
  if (rho >= 0.999) return Infinity; // Saturated queue
  // W_q = rho / (mu * (1 - rho)) in seconds -> convert to ms
  const wqSeconds = rho / (serviceRateMu * (1 - rho));
  return Math.round(wqSeconds * 1000);
}

/**
 * Calculate statistical percentiles (P50, P90, P95, P99) and mean from an array of numbers
 */
export function calculatePercentiles(samples: number[]): {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
} {
  if (!samples || samples.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0, mean: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;

  const getPercentile = (p: number): number => {
    const idx = (p / 100) * (n - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    if (upper === lower) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = Math.round((sum / n) * 10) / 10;

  return {
    p50: Math.round(getPercentile(50) * 10) / 10,
    p90: Math.round(getPercentile(90) * 10) / 10,
    p95: Math.round(getPercentile(95) * 10) / 10,
    p99: Math.round(getPercentile(99) * 10) / 10,
    mean,
  };
}
