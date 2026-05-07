# @ekaone/retry

> Composable retry primitive with exponential backoff, jitter, and AbortSignal support.

Zero dependencies. Works in Node 18+, Bun, Deno, browsers, and edge runtimes.

## Comparison — `@ekaone/retry` vs native `fetch`

See detailed comparison table [here](https://ekaone.github.io/retry/).

### Retry

| Feature | `@ekaone/retry` | `fetch` |
|---|---|---|
| **Automatic retry** — Retries failed calls without manual loops | ✓ built-in | ✗ manual |
| **Max attempts** — Hard cap on total number of tries | ✓ `maxAttempts` | ✗ none |
| **Exponential backoff** — Delay grows as 2^attempt between retries | ✓ built-in | ✗ none |
| **Linear backoff** — Delay grows linearly per attempt | ✓ built-in | ✗ none |
| **Fixed backoff** — Constant delay between every attempt | ✓ built-in | ✗ none |
| **Jitter** — Randomised delay to prevent thundering herd | ✓ full jitter | ✗ none |
| **Max delay cap** — Upper bound on computed delay | ✓ 30s default | ✗ none |

### Control

| Feature | `@ekaone/retry` | `fetch` |
|---|---|---|
| **shouldRetry predicate** — Selective retry on recoverable errors | ✓ per-error | ✗ none |
| **AbortSignal support** — External cancellation mid-retry loop | ✓ built-in | ~ per-request only |
| **Total timeout** — Cap on entire operation including delays | ✓ `totalTimeoutMs` | ✗ none |
| **onError hook** — Callback fired after each failed attempt | ✓ per-attempt | ✗ none |

### Error Handling

| Feature | `@ekaone/retry` | `fetch` |
|---|---|---|
| **RetryError with diagnostics** — Attempts count, lastError, failure reason | ✓ `RetryError` | ✗ raw error |
| **Failure reason** — exhausted / aborted / timeout / rejected | ✓ reason field | ✗ none |

### Scope

| Feature | `@ekaone/retry` | `fetch` |
|---|---|---|
| **Works with any async fn** — DB calls, SDK calls, agent turns | ✓ any Promise | ✗ HTTP only |
| **Works with Anthropic SDK** — `anthropic.messages.create()` | ✓ yes | ✗ no |
| **Works with native fetch** — Can wrap `fetch()` calls too | ✓ yes | ✓ yes |

### Runtime & Package

| Feature | `@ekaone/retry` | `fetch` |
|---|---|---|
| **Zero dependencies** | ✓ zero | ✓ native |
| **Node / Browser / Edge / Bun** | ✓ universal | ✓ universal |
| **ESM + CJS dual output** | ✓ tsup | N/A — native |

## Install

```sh
npm install @ekaone/retry
# or
pnpm add @ekaone/retry
```

## Usage

```ts
import { retry } from '@ekaone/retry'

// Basic
const data = await retry(() => fetch('https://api.example.com').then(r => r.json()))

// With options
const data = await retry(
  () => anthropic.messages.create({ model: 'claude-opus-4-5', ... }),
  {
    maxAttempts: 4,
    backoff: 'exponential',
    baseDelayMs: 200,
    jitter: true,
    shouldRetry: (error) => error?.status === 429,
    onError: (error, attempt) => console.warn(`Attempt ${attempt} failed`, error),
  }
)
```

## API

### `retry(fn, options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `maxAttempts` | `number` | `3` | Max attempts including the first call |
| `backoff` | `'fixed' \| 'linear' \| 'exponential'` | `'exponential'` | Delay growth strategy |
| `baseDelayMs` | `number` | `100` | Base delay in ms |
| `maxDelayMs` | `number` | `30_000` | Upper cap on computed delay |
| `totalTimeoutMs` | `number` | `undefined` | Cap on total elapsed time across all attempts |
| `jitter` | `boolean` | `false` | Randomise delay to prevent thundering herd |
| `signal` | `AbortSignal` | `undefined` | External cancellation |
| `shouldRetry` | `(error, attempt) => boolean \| undefined` | `undefined` | Selective retry predicate |
| `onError` | `(error, attempt) => void` | `undefined` | Per-attempt error hook |

### `RetryError`

Thrown when all attempts are exhausted or retry is stopped.

```ts
import { retry, RetryError } from '@ekaone/retry'

try {
  await retry(() => unstable(), { maxAttempts: 3 })
} catch (err) {
  if (err instanceof RetryError) {
    console.log(err.attempts)   // number of attempts made
    console.log(err.lastError)  // original error from last attempt
    console.log(err.reason)     // 'exhausted' | 'aborted' | 'timeout' | 'rejected'
  }
}
```

## Backoff Strategies

| Strategy | Delay formula |
|---|---|
| `fixed` | `baseDelayMs` every time |
| `linear` | `baseDelayMs × attempt` |
| `exponential` | `baseDelayMs × 2^(attempt-1)` |

All strategies are capped at `maxDelayMs`. Enable `jitter: true` to randomise between 0 and the computed value.

## Integration with `@ekaone/n-agent`

[n-agent](https://github.com/ekaone/n-agent) is multi-agent conversation loop with human-in-the-loop support

```ts
import { createAgent } from '@ekaone/n-agent'
import { retry } from '@ekaone/retry'

const agent = createAgent({
  onError: async (error, ctx) => {
    await retry(() => ctx.replayTurn(), {
      maxAttempts: 3,
      backoff: 'exponential',
      jitter: true,
      signal: ctx.signal,
    })
    return 'skip'
  }
})
```

## License

MIT © [Eka Prasetia](./LICENSE)

## Links

- [npm Package](https://www.npmjs.com/package/@ekaone/retry)
- [GitHub Repository](https://github.com/ekaone/retry)
- [Issue Tracker](https://github.com/ekaone/retry/issues)

---

⭐ If this library helps you, please consider giving it a star on GitHub!