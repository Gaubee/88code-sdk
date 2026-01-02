import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { PollingManager } from '../services/polling-manager'

describe('PollingManager', () => {
  let queryClient: QueryClient
  let pollingManager: PollingManager

  beforeEach(() => {
    vi.useFakeTimers()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    pollingManager = new PollingManager(queryClient, 5000)
  })

  afterEach(() => {
    vi.useRealTimers()
    queryClient.clear()
  })

  it('should subscribe and fetch data immediately when no cache exists', async () => {
    const queryKey = ['test', '1']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    pollingManager.subscribe(queryKey, queryFn, false)

    // Wait for the fetch to complete
    await vi.runAllTimersAsync()

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should unsubscribe and stop polling', async () => {
    const queryKey = ['test', '2']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    const unsubscribe = pollingManager.subscribe(queryKey, queryFn, true)

    // Initial fetch
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Unsubscribe
    unsubscribe()

    // Advance time - should not fetch again
    await vi.advanceTimersByTimeAsync(10000)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should continue polling when enabled', async () => {
    const queryKey = ['test', '3']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    pollingManager.subscribe(queryKey, queryFn, true)

    // Initial fetch
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Advance time for next poll
    await vi.advanceTimersByTimeAsync(5000)
    await vi.runAllTimersAsync()

    // Should have polled again
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('should stop polling when disabled via resubscribe', async () => {
    const queryKey = ['test', '4']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    const unsub = pollingManager.subscribe(queryKey, queryFn, true)

    // Initial fetch
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Disable polling (mimic hook: unsubscribe then subscribe disabled)
    unsub()
    pollingManager.subscribe(queryKey, queryFn, false)

    // Advance time - should not fetch again
    await vi.advanceTimersByTimeAsync(10000)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should respect new interval when config changes', async () => {
    const queryKey = ['test', '5']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    pollingManager.subscribe(queryKey, queryFn, true)

    // Initial fetch
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Change interval to 2 seconds
    pollingManager.setIntervalMs(2000)

    // Advance by 2 seconds (new interval)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.runAllTimersAsync()

    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('should handle multiple subscribers to the same query', async () => {
    const queryKey = ['test', '6']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    const unsub1 = pollingManager.subscribe(queryKey, queryFn, true)
    const unsub2 = pollingManager.subscribe(queryKey, queryFn, true)

    // Initial fetch (should only fetch once)
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Unsubscribe first subscriber
    unsub1()

    // Should still poll because second subscriber exists
    await vi.advanceTimersByTimeAsync(5000)
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(2)

    // Unsubscribe second subscriber
    unsub2()

    // Should stop polling
    await vi.advanceTimersByTimeAsync(5000)
    expect(queryFn).toHaveBeenCalledTimes(2)
  })

  it('should not crash when queryFn throws', async () => {
    const queryKey = ['test', '7']
    const queryFn = vi.fn().mockRejectedValue(new Error('Network error'))

    pollingManager.subscribe(queryKey, queryFn, true)

    // Should not throw
    await expect(vi.runAllTimersAsync()).resolves.not.toThrow()

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should resume polling after re-enabling', async () => {
    const queryKey = ['test', '8']
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

    const unsub = pollingManager.subscribe(queryKey, queryFn, true)

    // Initial fetch
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Disable
    unsub()
    pollingManager.subscribe(queryKey, queryFn, false)
    await vi.advanceTimersByTimeAsync(10000)
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Re-enable
    pollingManager.subscribe(queryKey, queryFn, true)

    // Should resume polling
    await vi.advanceTimersByTimeAsync(5000)
    await vi.runAllTimersAsync()
    expect(queryFn).toHaveBeenCalledTimes(2)
  })
})
