import { describe, it, expect } from "vitest";
import { computeDelay } from "../src/delay.js";

describe("computeDelay", () => {
  it("fixed — returns baseDelayMs every time", () => {
    expect(computeDelay(1, "fixed", 100, 30_000, false)).toBe(100);
    expect(computeDelay(5, "fixed", 100, 30_000, false)).toBe(100);
  });

  it("linear — scales with attempt number", () => {
    expect(computeDelay(1, "linear", 100, 30_000, false)).toBe(100);
    expect(computeDelay(3, "linear", 100, 30_000, false)).toBe(300);
  });

  it("exponential — doubles each attempt", () => {
    expect(computeDelay(1, "exponential", 100, 30_000, false)).toBe(100);
    expect(computeDelay(2, "exponential", 100, 30_000, false)).toBe(200);
    expect(computeDelay(3, "exponential", 100, 30_000, false)).toBe(400);
  });

  it("caps delay at maxDelayMs", () => {
    expect(computeDelay(10, "exponential", 100, 500, false)).toBe(500);
  });

  it("jitter returns value between 0 and computed delay", () => {
    for (let i = 0; i < 20; i++) {
      const d = computeDelay(3, "exponential", 100, 30_000, true);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(400);
    }
  });
});
