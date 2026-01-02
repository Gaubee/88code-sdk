import type { QueryClient, QueryKey } from '@tanstack/react-query'

type QueryFn = () => Promise<unknown>

interface Entry {
  keyHash: string
  queryKey: QueryKey
  queryFn: QueryFn
  subscribers: number
  running: boolean
  abortController: AbortController | null
  lastAttemptAt: number
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function stableClone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableClone)
  if (isPlainObject(value)) {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    const result: Record<string, unknown> = {}
    for (const [key, val] of entries) {
      result[key] = stableClone(val)
    }
    return result
  }
  return value
}

function hashQueryKey(queryKey: QueryKey): string {
  try {
    return JSON.stringify(stableClone(queryKey))
  } catch {
    return String(queryKey)
  }
}

/**
 * 轮询管理器（不使用 setInterval）
 *
 * 简化版：组件挂载即订阅，卸载即取消。自动刷新由全局 interval 控制。
 */
export class PollingManager {
  private queryClient: QueryClient
  private intervalMs: number
  private entries = new Map<string, Entry>()

  constructor(queryClient: QueryClient, initialIntervalMs: number = 5000) {
    this.queryClient = queryClient
    this.intervalMs = initialIntervalMs
  }

  setIntervalMs(intervalMs: number): void {
    this.intervalMs = intervalMs
    for (const entry of this.entries.values()) {
      entry.abortController?.abort()
    }
  }

  subscribe(queryKey: QueryKey, queryFn: QueryFn): () => void {
    const keyHash = hashQueryKey(queryKey)
    const entry: Entry = this.entries.get(keyHash) ?? {
      keyHash,
      queryKey,
      queryFn,
      subscribers: 0,
      running: false,
      abortController: null,
      lastAttemptAt: 0,
    }

    entry.queryKey = queryKey
    entry.queryFn = queryFn
    entry.subscribers += 1
    this.entries.set(keyHash, entry)

    if (!entry.running) {
      this.startLoop(entry)
    }

    return () => {
      const current = this.entries.get(keyHash)
      if (!current) return
      current.subscribers = Math.max(0, current.subscribers - 1)
      if (current.subscribers === 0) {
        current.abortController?.abort()
      }
    }
  }

  private startLoop(entry: Entry): void {
    entry.running = true
    entry.abortController = new AbortController()

    void this.runLoop(entry).finally(() => {
      entry.running = false
      entry.abortController = null
      if (entry.subscribers > 0) {
        this.startLoop(entry)
      }
    })
  }

  private getLastRequestAt(entry: Entry): number {
    const state = this.queryClient.getQueryState(entry.queryKey)
    const dataUpdatedAt = state?.dataUpdatedAt ?? 0
    return Math.max(entry.lastAttemptAt, dataUpdatedAt)
  }

  private async runLoop(entry: Entry): Promise<void> {
    while (entry.subscribers > 0) {
      const hasCache = this.queryClient.getQueryData(entry.queryKey) !== undefined
      if (!hasCache) {
        await this.fetchOnce(entry)
        continue
      }

      const lastAt = this.getLastRequestAt(entry)
      const dueAt = lastAt > 0 ? lastAt + this.intervalMs : 0
      const delay = dueAt > 0 ? dueAt - Date.now() : 0

      const controller = entry.abortController ?? new AbortController()
      entry.abortController = controller
      await sleep(Math.max(0, delay), controller.signal)

      if (entry.subscribers <= 0) return
      if (controller.signal.aborted) {
        entry.abortController = new AbortController()
        continue
      }

      await this.fetchOnce(entry)
    }
  }

  private async fetchOnce(entry: Entry): Promise<void> {
    try {
      await this.queryClient.fetchQuery({
        queryKey: entry.queryKey,
        queryFn: entry.queryFn,
      })
    } catch {
      // React Query handles errors
    } finally {
      entry.lastAttemptAt = Date.now()
    }
  }
}
