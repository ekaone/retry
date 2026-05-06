// ---------------------------------------------------------------------------
// Backoff strategy
// ---------------------------------------------------------------------------

export type BackoffStrategy = "fixed" | "linear" | "exponential";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /**
   * Maximum number of attempts (including the first call).
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Backoff strategy applied between attempts.
   * - `fixed`       — constant `baseDelayMs` each time
   * - `linear`      — `baseDelayMs * attempt`
   * - `exponential` — `baseDelayMs * 2^(attempt - 1)`
   * @default 'exponential'
   */
  backoff?: BackoffStrategy;

  /**
   * Base delay in milliseconds used by all backoff strategies.
   * @default 100
   */
  baseDelayMs?: number;

  /**
   * Upper cap on the computed delay in milliseconds.
   * Prevents unbounded waits on high attempt counts.
   * @default 30_000
   */
  maxDelayMs?: number;

  /**
   * Upper cap on the total elapsed time across all attempts + delays.
   * Throws a `RetryError` with `reason: 'timeout'` when exceeded.
   * @default undefined (no total timeout)
   */
  totalTimeoutMs?: number;

  /**
   * Add full jitter (randomise delay between 0 and the computed value).
   * Prevents thundering-herd when many callers retry at the same time.
   * @default false
   */
  jitter?: boolean;

  /**
   * External cancellation signal. When aborted, the retry loop stops
   * immediately and rejects with the abort reason.
   */
  signal?: AbortSignal;

  /**
   * Controls whether a given error should be retried.
   *
   * Return values:
   * - `true`      — force retry (bypasses default logic)
   * - `false`     — do not retry, throw immediately
   * - `undefined` — apply default logic (retry on any error)
   *
   * @param error   The thrown value from the last attempt
   * @param attempt Current attempt number (1 = first retry)
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean | undefined;

  /**
   * Called after each failed attempt, before the next delay.
   * Useful for logging, metrics, or side effects.
   *
   * @param error   The thrown value
   * @param attempt Attempt number that just failed (starts at 1)
   */
  onError?: (error: unknown, attempt: number) => void;
}

// ---------------------------------------------------------------------------
// RetryError
// ---------------------------------------------------------------------------

export type RetryFailureReason =
  | "exhausted"
  | "aborted"
  | "timeout"
  | "rejected";

export class RetryError extends Error {
  /** Total attempts made before giving up. */
  readonly attempts: number;
  /** The last error thrown by the wrapped function. */
  readonly lastError: unknown;
  /** Why retrying stopped. */
  readonly reason: RetryFailureReason;

  constructor(
    message: string,
    attempts: number,
    lastError: unknown,
    reason: RetryFailureReason,
  ) {
    super(message);
    this.name = "RetryError";
    this.attempts = attempts;
    this.lastError = lastError;
    this.reason = reason;
  }
}
