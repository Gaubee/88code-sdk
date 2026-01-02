/**
 * 智能自动重置调度器
 *
 * 提供定时自动重置功能，在执行前会先刷新数据确保基于最新状态决策
 */

import type { Subscription, ApiResult } from '../types.ts'
import type { MutationResult } from '../mutations.ts'
import {
  shouldResetSubscription,
  canReset,
  getCurrentResetWindow,
  getNextResetTime,
  hasResetInCurrentWindow,
  RESET_WINDOWS,
  type ResetWindow,
} from './reset-strategy.ts'

/** 订阅重置任务结果 */
export interface ResetTaskResult {
  subscriptionId: number
  subscriptionName: string
  success: boolean
  reason: string
  skipped: boolean
}

/** 调度器执行结果 */
export interface SchedulerExecutionResult {
  executed: boolean
  window: ResetWindow | null
  results: ResetTaskResult[]
  timestamp: Date
}

/** 调度器配置 */
export interface SmartResetSchedulerConfig {
  /** 获取订阅列表的函数 */
  fetchSubscriptions: () => Promise<ApiResult<Subscription[]>>
  /** 执行重置的函数 */
  resetCredits: (subscriptionId: number) => Promise<ApiResult<MutationResult>>
  /** 获取单个订阅启用状态的函数 */
  isAutoResetEnabled: (subscriptionId: number) => boolean
  /** 日志函数 (可选) */
  logger?: {
    info: (message: string, ...args: unknown[]) => void
    warn: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
  }
}

/**
 * 智能自动重置调度器
 */
export class SmartResetScheduler {
  private config: SmartResetSchedulerConfig
  private timerId: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(config: SmartResetSchedulerConfig) {
    this.config = config
  }

  private log(
    level: 'info' | 'warn' | 'error',
    message: string,
    ...args: unknown[]
  ) {
    if (this.config.logger) {
      this.config.logger[level](message, ...args)
    }
  }

  /**
   * 立即检查并执行重置（如果在窗口内）
   * 会先刷新订阅数据，再基于最新数据做决策
   */
  async checkAndExecute(): Promise<SchedulerExecutionResult> {
    const timestamp = new Date()
    const currentWindow = getCurrentResetWindow()

    if (!currentWindow) {
      return {
        executed: false,
        window: null,
        results: [],
        timestamp,
      }
    }

    this.log(
      'info',
      `在重置窗口内: ${currentWindow.hour}:${String(currentWindow.minute).padStart(2, '0')}`,
    )

    // 1. 先刷新订阅数据
    this.log('info', '正在获取最新订阅数据...')
    const subscriptionsResult = await this.config.fetchSubscriptions()

    if (!subscriptionsResult.success || !subscriptionsResult.data) {
      this.log('error', '获取订阅数据失败:', subscriptionsResult.message)
      return {
        executed: false,
        window: currentWindow,
        results: [],
        timestamp,
      }
    }

    const subscriptions = subscriptionsResult.data.filter(
      (sub) => sub.subscriptionStatus === '活跃中' && sub.isActive,
    )

    this.log('info', `找到 ${subscriptions.length} 个活跃订阅`)

    // 2. 计算窗口开始时间
    const windowStart = new Date(timestamp)
    windowStart.setHours(currentWindow.hour, currentWindow.minute, 0, 0)

    // 3. 分析每个订阅
    const results: ResetTaskResult[] = []

    for (const subscription of subscriptions) {
      // 检查是否启用了自动重置
      if (!this.config.isAutoResetEnabled(subscription.id)) {
        results.push({
          subscriptionId: subscription.id,
          subscriptionName: subscription.subscriptionPlanName,
          success: false,
          reason: '未启用智能自动重置',
          skipped: true,
        })
        continue
      }

      // 检查是否在本窗口内已重置
      if (hasResetInCurrentWindow(subscription, windowStart)) {
        results.push({
          subscriptionId: subscription.id,
          subscriptionName: subscription.subscriptionPlanName,
          success: false,
          reason: '本窗口内已重置',
          skipped: true,
        })
        continue
      }

      // 策略决策
      const strategyDecision = shouldResetSubscription(
        subscription,
        currentWindow.hour,
      )
      if (!strategyDecision.shouldReset) {
        results.push({
          subscriptionId: subscription.id,
          subscriptionName: subscription.subscriptionPlanName,
          success: false,
          reason: strategyDecision.reason,
          skipped: true,
        })
        continue
      }

      // 资格校验
      const eligibility = canReset(
        subscription,
        currentWindow.requiredResetTimes,
      )
      if (!eligibility.canReset) {
        results.push({
          subscriptionId: subscription.id,
          subscriptionName: subscription.subscriptionPlanName,
          success: false,
          reason: eligibility.reason ?? '不满足重置条件',
          skipped: true,
        })
        continue
      }

      // 4. 执行重置
      this.log('info', `正在重置: ${subscription.subscriptionPlanName}`)
      const resetResult = await this.config.resetCredits(subscription.id)

      results.push({
        subscriptionId: subscription.id,
        subscriptionName: subscription.subscriptionPlanName,
        success: resetResult.success,
        reason: resetResult.success
          ? strategyDecision.reason
          : (resetResult.message ?? '重置失败'),
        skipped: false,
      })
    }

    const executedCount = results.filter((r) => !r.skipped).length
    const successCount = results.filter((r) => r.success).length
    this.log('info', `执行完成: ${successCount}/${executedCount} 成功`)

    return {
      executed: true,
      window: currentWindow,
      results,
      timestamp,
    }
  }

  /**
   * 启动自动调度
   * 在每个重置窗口时间点自动执行检查
   */
  start(): void {
    if (this.running) {
      this.log('warn', '调度器已在运行中')
      return
    }

    this.running = true
    this.log('info', '智能自动重置调度器已启动')
    this.log(
      'info',
      `重置窗口: ${RESET_WINDOWS.map((w) => `${w.hour}:${String(w.minute).padStart(2, '0')}`).join(', ')}`,
    )

    const runOnce = async () => {
      try {
        await this.checkAndExecute()
      } catch (err) {
        this.log('error', '执行出错:', err)
      }
    }

    void runOnce()
    this.timerId = setInterval(runOnce, 30_000)
  }

  /**
   * 停止自动调度
   */
  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    this.running = false
    this.log('info', '智能自动重置调度器已停止')
  }

  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * 获取下次执行时间
   */
  getNextExecutionTime(): Date | null {
    const next = getNextResetTime()
    return next?.time ?? null
  }
}

/**
 * 创建调度器实例
 */
export function createSmartResetScheduler(
  config: SmartResetSchedulerConfig,
): SmartResetScheduler {
  return new SmartResetScheduler(config)
}
