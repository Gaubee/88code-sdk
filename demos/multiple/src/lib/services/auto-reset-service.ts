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
import type { Account } from '../accounts-store'
import { Code88Service } from './code88-service'
import {
  isSubscriptionAutoResetEnabled,
  setLastExecution,
  getAutoResetSettings,
} from '../auto-reset-store'

export class AutoResetService {
  private schedulers = new Map<string, SmartResetScheduler>()
  private code88: Code88Service

  constructor(code88Service: Code88Service) {
    this.code88 = code88Service
  }

  /**
   * 为账户创建或获取调度器
   */
  getScheduler(account: Account): SmartResetScheduler {
    const existing = this.schedulers.get(account.id)
    if (existing) {
      return existing
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
