import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface PollingConfig {
  enabled: boolean;
  intervalMs: number;
}

type QueryFn = () => Promise<unknown>;

interface Entry {
  keyHash: string;
  queryKey: QueryKey;
  queryFn: QueryFn;
  subscribers: number;
  running: boolean;
  abortController: AbortController | null;
  /**
   * 上一次轮询 loop 结束一次 fetch 的时间（无论成功/失败）。
   * 用于避免错误时出现“疯狂重试”。
   */
  lastAttemptAt: number;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stableClone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableClone);
  if (isPlainObject(value)) {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = stableClone(val);
    }
    return result;
  }
  return value;
}

function hashQueryKey(queryKey: QueryKey): string {
  try {
    return JSON.stringify(stableClone(queryKey));
  } catch {
    // 兜底：确保不会因为 hash 失败导致整个轮询系统崩溃
    return String(queryKey);
  }
}

/**
 * 轮询管理器（不使用 setInterval）
 *
 * 核心语义：
 * - subscribe()：开始订阅（引用计数），如果启用自动刷新则按 intervalMs 顺序轮询
 * - unsubscribe()：没有订阅者时停止轮询，但保留 query 的缓存与最后请求时间
 * - 轮询机制：`loop { await fetchWithRetry(); await sleep(interval) }`
 *   - 等请求返回后才开始下一次计时，避免并发请求堆叠
 *   - 重订阅时：基于“最后一次请求时间 + interval”决定下一次请求何时发生
 */
export class PollingManager {
  private queryClient: QueryClient;
  private config: PollingConfig;
  private entries = new Map<string, Entry>();

  constructor(queryClient: QueryClient, initialConfig: PollingConfig) {
    this.queryClient = queryClient;
    this.config = initialConfig;
  }

  setConfig(next: PollingConfig): void {
    const prevEnabled = this.config.enabled;
    this.config = next;

    // 变更配置时，唤醒所有 sleep，让它们立刻重新计算 delay / enabled。
    for (const entry of this.entries.values()) {
      entry.abortController?.abort();
    }

    // 从禁用 -> 启用：为所有已订阅但未运行的 entry 启动轮询 loop。
    if (!prevEnabled && next.enabled) {
      for (const entry of this.entries.values()) {
        if (entry.subscribers > 0 && !entry.running) {
          this.startLoop(entry);
        }
      }
    }
  }

  subscribe(queryKey: QueryKey, queryFn: QueryFn): () => void {
    const keyHash = hashQueryKey(queryKey);
    const entry: Entry =
      this.entries.get(keyHash) ??
      ({
        keyHash,
        queryKey,
        queryFn,
        subscribers: 0,
        running: false,
        abortController: null,
        lastAttemptAt: 0,
      } satisfies Entry);

    entry.queryKey = queryKey;
    entry.queryFn = queryFn;
    entry.subscribers += 1;
    this.entries.set(keyHash, entry);

    if (!entry.running) {
      this.startLoop(entry);
    }

    return () => {
      const current = this.entries.get(keyHash);
      if (!current) return;
      current.subscribers = Math.max(0, current.subscribers - 1);
      if (current.subscribers === 0) {
        // 没有订阅者：停止轮询（但保留 entry 以保存 lastAttemptAt / queryKey）
        current.abortController?.abort();
      }
    };
  }

  private startLoop(entry: Entry): void {
    entry.running = true;
    entry.abortController = new AbortController();

    void this.runLoop(entry).finally(() => {
      entry.running = false;
      entry.abortController = null;
      // 如果 loop 结束时仍然有人订阅且启用自动刷新，则重启（例如：sleep 被 abort 唤醒时）。
      if (entry.subscribers > 0 && this.config.enabled) {
        this.startLoop(entry);
      }
    });
  }

  private getLastRequestAt(entry: Entry): number {
    const state = this.queryClient.getQueryState(entry.queryKey);
    const dataUpdatedAt = state?.dataUpdatedAt ?? 0;
    return Math.max(entry.lastAttemptAt, dataUpdatedAt);
  }

  private async runLoop(entry: Entry): Promise<void> {
    while (entry.subscribers > 0) {
      // 确保第一次订阅能拉到数据（即使自动刷新被关闭）
      const hasCache = this.queryClient.getQueryData(entry.queryKey) !== undefined;
      if (!hasCache) {
        await this.fetchOnce(entry);
        continue;
      }

      if (!this.config.enabled) {
        return;
      }

      // 基于 “最后一次请求时间 + interval” 决定下一次请求时间
      const lastAt = this.getLastRequestAt(entry);
      const dueAt = lastAt > 0 ? lastAt + this.config.intervalMs : 0;
      const delay = dueAt > 0 ? dueAt - Date.now() : 0;

      // 这里的 sleep 不是 setInterval：会被 abort 唤醒
      const controller = entry.abortController ?? new AbortController();
      entry.abortController = controller;
      await sleep(Math.max(0, delay), controller.signal);

      // 可能是：取消订阅 / 配置变化 / 被唤醒，先重新检查条件
      if (entry.subscribers <= 0) return;
      if (!this.config.enabled) return;
      if (controller.signal.aborted) {
        // reset controller，进入下一轮重新计算
        entry.abortController = new AbortController();
        continue;
      }

      await this.fetchOnce(entry);
    }
  }

  private async fetchOnce(entry: Entry): Promise<void> {
    try {
      await this.queryClient.fetchQuery({
        queryKey: entry.queryKey,
        queryFn: entry.queryFn,
      });
    } catch {
      // 交给 React Query 自己的 error 状态；轮询层不在这里吞掉错误也不抛出终止 loop
    } finally {
      entry.lastAttemptAt = Date.now();
    }
  }
}
