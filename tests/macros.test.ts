import { describe, expect, it, vi } from 'vitest'

import { memoizeRuntime, retryRuntime } from '../src/macros'

describe('macro runtimes', () => {
  it('memoizeRuntime caches results per-argument', () => {
    const spy = vi.fn((value: number) => value * Math.random())
    const memoized = memoizeRuntime(spy)

    const first = memoized(1)
    const second = memoized(1)
    const third = memoized(2)

    expect(first).toBe(second)
    expect(third).not.toBe(first)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('retryRuntime retries sync failures until success', async () => {
    vi.useFakeTimers()
    let attempts = 0
    const flaky = () => {
      attempts += 1
      if (attempts < 3) {
        throw new Error('boom')
      }
      return attempts
    }

    const wrapped = retryRuntime(flaky, { max: 3, backoff: 'none', baseMs: 0 })
    const promise = wrapped()
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe(3)
    expect(attempts).toBe(3)
    vi.useRealTimers()
  })
})
