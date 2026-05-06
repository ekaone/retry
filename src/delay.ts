import type { BackoffStrategy } from "./types.js";

/**
 * Compute the raw delay (ms) for a given attempt and strategy.
 * `attempt` starts at 1 for the first retry.
 */
export function computeDelay(
  attempt: number,
  strategy: BackoffStrategy,
  baseDelayMs: number,
  maxDelayMs: number,
  jitter: boolean,
): number {
  let delay: number;

  switch (strategy) {
    case "fixed":
      delay = baseDelayMs;
      break;
    case "linear":
      delay = baseDelayMs * attempt;
      break;
    case "exponential":
    default:
      delay = baseDelayMs * Math.pow(2, attempt - 1);
      break;
  }

  // Cap at maxDelayMs
  delay = Math.min(delay, maxDelayMs);

  // Full jitter: randomise between 0 and computed delay
  if (jitter) {
    delay = Math.random() * delay;
  }

  return Math.floor(delay);
}

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * Rejects early if the provided AbortSignal fires.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const id = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
