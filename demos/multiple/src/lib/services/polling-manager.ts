import type { QueryClient, QueryKey } from "@tanstack/react-query";

type QueryFn = () => Promise<unknown>;

interface Entry {
  keyHash: string;
  queryKey: QueryKey;
  queryFn: QueryFn;
  enabled: boolean;
  running: boolean;
  abortController: AbortController | null;
  /**
   * 上一次轮询 loop 结束一次 fetch 的时间（无论成功/失败）。
   * 用于避免错误时出现"疯狂重试"。
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
    return String(queryKey);
  }
}

/**
 * 轮询管理器（不使用 setInterval）
 *
 * 核心语义：
 * - subscribe(queryKey, queryFn, enabled)：订阅轮询，enabled 由调用方控制
 * - 轮询机制：`loop { await fetch(); await sleep(interval) }`
 *   - 等请求返回后才开始下一次计时，避免并发请求堆叠
 */
export class PollingManager {
  private queryClient: QueryClient;
  private intervalMs: number;
  private entries = new Map<string, Entry>();

  constructor(queryClient: QueryClient, initialIntervalMs: number = 5000) {
    this.queryClient = queryClient;
    this.intervalMs = initialIntervalMs;
  }

  setIntervalMs(intervalMs: number): void {
    this.intervalMs = intervalMs;
    // 唤醒所有 sleep，让它们重新计算 delay
    for (const entry of this.entries.values()) {
      entry.abortController?.abort();
    }
  }

  /**
   * 订阅轮询
   * @param queryKey Query Key
   * @param queryFn Query 函数
   * @param enabled 是否启用轮询（来自页面级 Context）
   * @returns 取消订阅函数
   */
  subscribe(queryKey: QueryKey, queryFn: QueryFn, enabled: boolean): () => void {
    const keyHash = hashQueryKey(queryKey);
    let entry = this.entries.get(keyHash);

    if (!entry) {
      entry = {
        keyHash,
        queryKey,
        queryFn,
        enabled,
        running: false,
        abortController: null,
        lastAttemptAt: 0,
      };
      this.entries.set(keyHash, entry);
    } else {
      // 更新
      entry.queryKey = queryKey;
      entry.queryFn = queryFn;
    }

    const prevEnabled = entry.enabled;
    entry.enabled = enabled;

    // enabled 变化时唤醒 loop
    if (prevEnabled !== enabled) {
      entry.abortController?.abort();
    }

    // 启动 loop
    if (enabled && !entry.running) {
      this.startLoop(entry);
    }

    return () => {
      const current = this.entries.get(keyHash);
      if (!current) return;
      current.enabled = false;
      current.abortController?.abort();
    };
  }

  private startLoop(entry: Entry): void {
    entry.running = true;
    entry.abortController = new AbortController();

    void this.runLoop(entry).finally(() => {
      entry.running = false;
      entry.abortController = null;
      // 如果 loop 结束时仍然 enabled，则重启
      if (entry.enabled) {
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
    while (entry.enabled) {
      // 确保第一次能拉到数据
      const hasCache = this.queryClient.getQueryData(entry.queryKey) !== undefined;
      if (!hasCache) {
        await this.fetchOnce(entry);
        continue;
      }

      if (!entry.enabled) {
        return;
      }

      // 基于 "最后一次请求时间 + interval" 决定下一次请求时间
      const lastAt = this.getLastRequestAt(entry);
      const dueAt = lastAt > 0 ? lastAt + this.intervalMs : 0;
      const delay = dueAt > 0 ? dueAt - Date.now() : 0;

      const controller = entry.abortController ?? new AbortController();
      entry.abortController = controller;
      await sleep(Math.max(0, delay), controller.signal);

      // 检查条件
      if (!entry.enabled) return;
      if (controller.signal.aborted) {
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
      // 交给 React Query 处理错误
    } finally {
      entry.lastAttemptAt = Date.now();
    }
  }
}
