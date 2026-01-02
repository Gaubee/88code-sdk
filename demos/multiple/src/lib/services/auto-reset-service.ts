/**
 * 智能自动重置服务
 *
 * 集成 SDK 的 SmartResetScheduler，在执行前刷新数据
 */

import {
  createSmartResetScheduler,
  type SmartResetScheduler,
  type SchedulerExecutionResult,
} from '@gaubee/88code-sdk'
import { getAccounts, type Account } from '../accounts-store'
import { Code88Service } from './code88-service'
import {
  isSubscriptionAutoResetEnabled,
  setLastExecution,
  getAutoResetSettings,
} from '../auto-reset-store'

const AUTO_RESET_POLL_INTERVAL_MS = 30_000

export class AutoResetService {
  private schedulers = new Map<string, SmartResetScheduler>()
  private schedulerMeta: Map<
    string,
    { token: string; apiHost: string; name: string }
  > = new Map()
  private code88: Code88Service
  private pollTimerId: ReturnType<typeof setInterval> | null = null
  private pollInFlight = false

  constructor(code88Service: Code88Service) {
    this.code88 = code88Service
  }

  startPolling(): void {
    if (typeof window === 'undefined') return
    if (this.pollTimerId) return

    void this.pollOnce()
    this.pollTimerId = setInterval(() => {
      void this.pollOnce()
    }, AUTO_RESET_POLL_INTERVAL_MS)
  }

  stopPolling(): void {
    if (this.pollTimerId) {
      clearInterval(this.pollTimerId)
      this.pollTimerId = null
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.pollInFlight) return
    this.pollInFlight = true

    try {
      const settings = getAutoResetSettings()
      if (!settings.enabled) {
        this.stopAll()
        return
      }

      const accounts = getAccounts()
      const accountIdSet = new Set(accounts.map((a) => a.id))

      // 清理被删除的账号调度器
      for (const [accountId, scheduler] of this.schedulers.entries()) {
        if (!accountIdSet.has(accountId)) {
          scheduler.stop()
          this.schedulers.delete(accountId)
          this.schedulerMeta.delete(accountId)
        }
      }

      const executions = await Promise.all(
        accounts.map(async (account) => {
          const scheduler = this.getScheduler(account)
          try {
            return { account, result: await scheduler.checkAndExecute() }
          } catch (err) {
            console.error(`[AutoReset:${account.name}] 执行检查失败`, err)
            return null
          }
        }),
      )

      const executed = executions.filter(
        (item): item is NonNullable<typeof item> =>
          !!item && item.result.executed,
      )

      if (executed.length > 0) {
        const { window, timestamp } = executed[0].result
        const mergedResults = executed.flatMap(({ account, result }) =>
          result.results.map((r) => ({
            subscriptionId: r.subscriptionId,
            subscriptionName:
              executed.length > 1
                ? `[${account.name}] ${r.subscriptionName}`
                : r.subscriptionName,
            success: r.success,
            reason: r.reason,
          })),
        )

        setLastExecution({
          timestamp: timestamp.toISOString(),
          window: window
            ? `${window.hour}:${String(window.minute).padStart(2, '0')}`
            : '自动执行',
          results: mergedResults,
        })
      }
    } finally {
      this.pollInFlight = false
    }
  }

  /**
   * 为账户创建或获取调度器
   */
  getScheduler(account: Account): SmartResetScheduler {
    const existing = this.schedulers.get(account.id)
    const meta = this.schedulerMeta.get(account.id)
    if (
      existing &&
      meta &&
      meta.token === account.token &&
      meta.apiHost === account.apiHost &&
      meta.name === account.name
    ) {
      return existing
    }

    if (existing) {
      existing.stop()
      this.schedulers.delete(account.id)
      this.schedulerMeta.delete(account.id)
    }

    const queries = this.code88.getQueries(account)
    const mutations = this.code88.getMutations(account)

    const scheduler = createSmartResetScheduler({
      fetchSubscriptions: async () => {
        console.log(
          `[AutoReset] 正在获取账户 ${account.name} 的最新订阅数据...`,
        )
        return queries.getAllSubscriptions()
      },
      resetCredits: async (subscriptionId) => {
        console.log(`[AutoReset] 正在重置订阅 ${subscriptionId}...`)
        return mutations.resetCredits(subscriptionId)
      },
      isAutoResetEnabled: (subscriptionId) => {
        return isSubscriptionAutoResetEnabled(subscriptionId)
      },
      logger: {
        info: (msg, ...args) =>
          console.log(`[AutoReset:${account.name}]`, msg, ...args),
        warn: (msg, ...args) =>
          console.warn(`[AutoReset:${account.name}]`, msg, ...args),
        error: (msg, ...args) =>
          console.error(`[AutoReset:${account.name}]`, msg, ...args),
      },
    })

    this.schedulers.set(account.id, scheduler)
    this.schedulerMeta.set(account.id, {
      token: account.token,
      apiHost: account.apiHost,
      name: account.name,
    })
    return scheduler
  }

  /**
   * 启动账户的自动重置调度
   */
  start(account: Account): void {
    const settings = getAutoResetSettings()
    if (!settings.enabled) {
      console.log(`[AutoReset] 全局开关未启用，跳过启动`)
      return
    }

    const scheduler = this.getScheduler(account)
    if (!scheduler.isRunning()) {
      scheduler.start()
      void scheduler.checkAndExecute().catch((err) => {
        console.error(`[AutoReset:${account.name}] 启动后执行检查失败`, err)
      })
    }
  }

  /**
   * 停止账户的自动重置调度
   */
  stop(account: Account): void {
    const scheduler = this.schedulers.get(account.id)
    if (scheduler) {
      scheduler.stop()
    }
  }

  /**
   * 停止所有调度器
   */
  stopAll(): void {
    for (const scheduler of this.schedulers.values()) {
      scheduler.stop()
    }
  }

  /**
   * 立即执行检查（手动触发）
   */
  async executeNow(account: Account): Promise<SchedulerExecutionResult> {
    const scheduler = this.getScheduler(account)
    const result = await scheduler.checkAndExecute()

    // 保存执行结果
    if (result.executed) {
      setLastExecution({
        timestamp: result.timestamp.toISOString(),
        window: result.window
          ? `${result.window.hour}:${String(result.window.minute).padStart(2, '0')}`
          : '手动执行',
        results: result.results.map((r) => ({
          subscriptionId: r.subscriptionId,
          subscriptionName: r.subscriptionName,
          success: r.success,
          reason: r.reason,
        })),
      })
    }

    return result
  }

  /**
   * 获取下次执行时间
   */
  getNextExecutionTime(account: Account): Date | null {
    const scheduler = this.schedulers.get(account.id)
    return scheduler?.getNextExecutionTime() ?? null
  }

  /**
   * 检查调度器是否运行中
   */
  isRunning(account: Account): boolean {
    const scheduler = this.schedulers.get(account.id)
    return scheduler?.isRunning() ?? false
  }
}
