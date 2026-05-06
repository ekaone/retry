import { RetryError } from "./types.js";
import type { RetryOptions } from "./types.js";
import { computeDelay, sleep } from "./delay.js";

const DEFAULTS = {
  maxAttempts: 3,
  backoff: "exponential",
  baseDelayMs: 100,
  maxDelayMs: 30_000,
  jitter: false,
} as const satisfies Partial<RetryOptions>;

/**
 * Retry any async function with configurable backoff, jitter,
 * abort support, and per-attempt hooks.
 *
 * @example
 * ```ts
 * const data = await retry(
 *   () => anthropic.messages.create({ ... }),
 *   { maxAttempts: 4, backoff: 'exponential', jitter: true }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = DEFAULTS.maxAttempts,
    backoff = DEFAULTS.backoff,
    baseDelayMs = DEFAULTS.baseDelayMs,
    maxDelayMs = DEFAULTS.maxDelayMs,
    jitter = DEFAULTS.jitter,
    totalTimeoutMs,
    signal,
    shouldRetry,
    onError,
  } = options;

  const startedAt = totalTimeoutMs !== undefined ? Date.now() : 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Honour external abort before every attempt
    if (signal?.aborted) {
      throw new RetryError(
        `Retry aborted before attempt ${attempt}`,
        attempt - 1,
        lastError,
        "aborted",
      );
    }

    // Check total timeout before every attempt
    if (totalTimeoutMs !== undefined) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= totalTimeoutMs) {
        throw new RetryError(
          `Retry total timeout of ${totalTimeoutMs}ms exceeded after ${attempt - 1} attempt(s)`,
          attempt - 1,
          lastError,
          "timeout",
        );
      }
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Per-attempt hook
      onError?.(error, attempt);

      const isLastAttempt = attempt === maxAttempts;

      // shouldRetry predicate
      if (shouldRetry !== undefined) {
        const decision = shouldRetry(error, attempt);
        if (decision === false) {
          throw new RetryError(
            `Retry rejected by shouldRetry on attempt ${attempt}`,
            attempt,
            error,
            "rejected",
          );
        }
        // decision === true  → force retry even on last attempt
        // decision === undefined → fall through to default logic
        if (decision === true && isLastAttempt) {
          // Still respect maxAttempts — break out after logging
          break;
        }
      }

      if (isLastAttempt) break;

      // Compute delay for next attempt
      const delay = computeDelay(
        attempt,
        backoff,
        baseDelayMs,
        maxDelayMs,
        jitter,
      );

      // Check total timeout vs planned delay
      if (totalTimeoutMs !== undefined) {
        const elapsed = Date.now() - startedAt;
        const remaining = totalTimeoutMs - elapsed;
        if (remaining <= 0) {
          throw new RetryError(
            `Retry total timeout of ${totalTimeoutMs}ms exceeded`,
            attempt,
            error,
            "timeout",
          );
        }
        // Sleep only as long as the budget allows
        await sleep(Math.min(delay, remaining), signal);
      } else {
        await sleep(delay, signal);
      }
    }
  }

  throw new RetryError(
    `Retry exhausted after ${maxAttempts} attempt(s)`,
    maxAttempts,
    lastError,
    "exhausted",
  );
}
