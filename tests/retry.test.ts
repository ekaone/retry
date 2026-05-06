import { describe, it, expect, vi } from "vitest";
import { retry, RetryError } from "../src/index.js";

// Speed up tests — patch sleep to resolve immediately
vi.mock("../src/delay.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/delay.js")>();
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function failTimes(n: number, resolveWith: string = "ok") {
  let calls = 0;
  return vi.fn(async () => {
    calls++;
    if (calls <= n) throw new Error(`fail #${calls}`);
    return resolveWith;
  });
}

// ---------------------------------------------------------------------------
// Basic success / failure
// ---------------------------------------------------------------------------

describe("retry — basic", () => {
  it("resolves immediately when fn succeeds on first call", async () => {
    const fn = vi.fn(async () => "hello");
    const result = await retry(fn);
    expect(result).toBe("hello");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries and resolves when fn succeeds before maxAttempts", async () => {
    const fn = failTimes(2, "done");
    const result = await retry(fn, { maxAttempts: 3 });
    expect(result).toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws RetryError after exhausting all attempts", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(retry(fn, { maxAttempts: 3 })).rejects.toThrow(RetryError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("RetryError carries correct attempts count and lastError", async () => {
    const cause = new Error("root cause");
    const fn = vi.fn(async () => {
      throw cause;
    });

    try {
      await retry(fn, { maxAttempts: 2 });
    } catch (err) {
      expect(err).toBeInstanceOf(RetryError);
      const retryErr = err as RetryError;
      expect(retryErr.attempts).toBe(2);
      expect(retryErr.lastError).toBe(cause);
      expect(retryErr.reason).toBe("exhausted");
    }
  });
});

// ---------------------------------------------------------------------------
// shouldRetry predicate
// ---------------------------------------------------------------------------

describe("retry — shouldRetry", () => {
  it("stops immediately when shouldRetry returns false", async () => {
    const fn = vi.fn(async () => {
      throw new Error("auth");
    });
    await expect(
      retry(fn, {
        maxAttempts: 5,
        shouldRetry: () => false,
      }),
    ).rejects.toMatchObject({ reason: "rejected" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries when shouldRetry returns true", async () => {
    const fn = failTimes(2, "recovered");
    const result = await retry(fn, {
      maxAttempts: 4,
      shouldRetry: () => true,
    });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses default logic when shouldRetry returns undefined", async () => {
    const fn = failTimes(1, "fine");
    const result = await retry(fn, {
      maxAttempts: 3,
      shouldRetry: () => undefined,
    });
    expect(result).toBe("fine");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes error and attempt number to shouldRetry", async () => {
    const decisions: Array<{ attempt: number }> = [];
    const fn = vi.fn(async () => {
      throw new Error("x");
    });

    await retry(fn, {
      maxAttempts: 3,
      shouldRetry: (_err, attempt) => {
        decisions.push({ attempt });
        return undefined;
      },
    }).catch(() => {});

    expect(decisions.map((d) => d.attempt)).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// onError hook
// ---------------------------------------------------------------------------

describe("retry — onError", () => {
  it("calls onError for each failed attempt", async () => {
    const errors: number[] = [];
    const fn = failTimes(2, "ok");

    await retry(fn, {
      maxAttempts: 3,
      onError: (_err, attempt) => errors.push(attempt),
    });

    expect(errors).toEqual([1, 2]);
  });

  it("onError receives the thrown error", async () => {
    const sentinel = new Error("sentinel");
    const received: unknown[] = [];
    const fn = vi.fn(async () => {
      throw sentinel;
    });

    await retry(fn, {
      maxAttempts: 2,
      onError: (err) => received.push(err),
    }).catch(() => {});

    expect(received[0]).toBe(sentinel);
  });
});

// ---------------------------------------------------------------------------
// AbortSignal
// ---------------------------------------------------------------------------

describe("retry — AbortSignal", () => {
  it("rejects immediately when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn(async () => "ok");

    await expect(
      retry(fn, { signal: controller.signal }),
    ).rejects.toMatchObject({ reason: "aborted" });

    expect(fn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RetryError fields
// ---------------------------------------------------------------------------

describe("RetryError", () => {
  it("has name RetryError", async () => {
    const fn = vi.fn(async () => {
      throw new Error("e");
    });
    try {
      await retry(fn, { maxAttempts: 1 });
    } catch (err) {
      expect((err as RetryError).name).toBe("RetryError");
    }
  });

  it("reason is exhausted when all attempts fail", async () => {
    const fn = vi.fn(async () => {
      throw new Error("e");
    });
    try {
      await retry(fn, { maxAttempts: 2 });
    } catch (err) {
      expect((err as RetryError).reason).toBe("exhausted");
    }
  });
});
