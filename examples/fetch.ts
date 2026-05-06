import { retry } from "../dist/index.js";

// Basic
// const data = await retry(() =>
//   fetch("https://jsonplaceholder.typicode.com/todos/1").then((r) => r.json()),
// );

// With options
const data2 = await retry(
  () =>
    fetch("https://jsonplaceholder.typicode.com/todos/1").then((r) => r.json()),
  {
    maxAttempts: 4,
    backoff: "exponential",
    baseDelayMs: 200,
    jitter: true,
    shouldRetry: (error) => (error as any)?.status === 429,
    onError: (error, attempt) =>
      console.warn(`Attempt ${attempt} failed`, error),
  },
);

console.log(data2);
