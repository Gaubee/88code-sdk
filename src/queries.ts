/**
 * 88Code SDK - 只读查询模块（安全 API）
 *
 * 此模块包含所有只读操作，不会修改任何数据
 * 可以安全地用于查询和监控
 */

import { Code88Client } from './client.ts'
import { API_ENDPOINTS } from './config.ts'
import type {
  ApiKeyInfo,
  ApiKeyQueryParams,
  ApiResult,
  CodexFreeQuota,
  CreditHistoryItem,
  CreditHistoryParams,
  CreditHistoryRawResponse,
  DashboardData,
  LoginInfo,
  ModelUsageTimelineParams,
  ModelUsageTimelinePoint,
  PagedResponse,
  Subscription,
  UsageTrendParams,
  UsageTrendPoint,
} from './types.ts'

/**
 * 生成带时区偏移的 ISO 格式时间字符串 (如 2023-12-11T12:00:00+08:00)
 * 相比 date.toISOString() (总是返回 UTC Z), 这个函数保留本地时区
 */
function toLocalISOString(date: Date): string {
  const tzo = -date.getTimezoneOffset()
  const dif = tzo >= 0 ? '+' : '-'
  const pad = (num: number) => (num < 10 ? '0' : '') + num

  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) +
    dif +
    pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' +
    pad(Math.abs(tzo) % 60)
  )
}

/**
 * 只读查询 API
 *
 * @example
 * ```ts
 * const client = new Code88Client({ authToken: "your-token" });
 * const queries = new Code88Queries(client);
 *
 * // 获取用户信息
 * const userInfo = await queries.getLoginInfo();
 *
 * // 获取订阅列表
 * const subscriptions = await queries.getSubscriptions();
 *
 * // 获取仪表盘数据
 * const dashboard = await queries.getDashboard();
 * ```
 */
export class Code88Queries {
  constructor(private client: Code88Client) {}

  /**
   * 获取当前登录用户信息
   */
  async getLoginInfo(): Promise<ApiResult<LoginInfo>> {
    return this.client.get<LoginInfo>(API_ENDPOINTS.LOGIN_INFO)
  }

  /**
   * 获取所有订阅列表（原始数据）
   */
  async getAllSubscriptions(): Promise<ApiResult<Subscription[]>> {
    return this.client.get<Subscription[]>(API_ENDPOINTS.SUBSCRIPTIONS)
  }

  /**
   * 获取活跃订阅列表（已过滤）
   *
   * 只返回 subscriptionStatus === "活跃中" && isActive === true 的订阅
   */
  async getActiveSubscriptions(): Promise<ApiResult<Subscription[]>> {
    const result = await this.getAllSubscriptions()

    if (result.success && result.data) {
      result.data = result.data.filter(
        (sub) => sub.subscriptionStatus === '活跃中' && sub.isActive === true,
      )
    }

    return result
  }

  /**
   * 获取订阅列表（别名，默认返回活跃订阅）
   */
  async getSubscriptions(): Promise<ApiResult<Subscription[]>> {
    return this.getActiveSubscriptions()
  }

  /**
   * 获取仪表盘统计数据
   */
  async getDashboard(): Promise<ApiResult<DashboardData>> {
    return this.client.get<DashboardData>(API_ENDPOINTS.DASHBOARD)
  }

  /**
   * 获取用量趋势数据
   *
   * @param params 查询参数
   * @param params.days 查询天数，默认 30
   * @param params.granularity 时间粒度，默认 "day"
   */
  async getUsageTrend(
    params: UsageTrendParams = {},
  ): Promise<ApiResult<UsageTrendPoint[]>> {
    const { days = 30, granularity = 'day' } = params
    const endpoint = `${API_ENDPOINTS.USAGE_TREND}?days=${days}&granularity=${granularity}`
    return this.client.get<UsageTrendPoint[]>(endpoint)
  }

  /**
   * 获取指定订阅的详细信息
   *
   * @param subscriptionId 订阅 ID
   */
  async getSubscriptionById(
    subscriptionId: number,
  ): Promise<ApiResult<Subscription | null>> {
    const result = await this.getAllSubscriptions()

    if (!result.success) {
      return {
        success: false,
        data: null,
        message: result.message,
        error: result.error,
      }
    }

    const subscription = result.data.find((sub) => sub.id === subscriptionId)

    return {
      success: true,
      data: subscription ?? null,
    }
  }

  /**
   * 获取订阅额度概要
   *
   * 返回所有活跃订阅的额度汇总信息
   */
  async getCreditsOverview(): Promise<
    ApiResult<{
      totalCredits: number
      usedCredits: number
      remainingCredits: number
      subscriptions: Array<{
        id: number
        name: string
        currentCredits: number
        creditLimit: number
        remainingDays: number
      }>
    }>
  > {
    const result = await this.getActiveSubscriptions()

    if (!result.success) {
      return {
        success: false,
        data: null as never,
        message: result.message,
        error: result.error,
      }
    }

    const subscriptions = result.data.map((sub) => ({
      id: sub.id,
      name: sub.subscriptionPlanName,
      currentCredits: sub.currentCredits,
      creditLimit: sub.subscriptionPlan.creditLimit,
      remainingDays: sub.remainingDays,
    }))

    const totalCredits = subscriptions.reduce(
      (sum, sub) => sum + sub.creditLimit,
      0,
    )
    const remainingCredits = subscriptions.reduce(
      (sum, sub) => sum + sub.currentCredits,
      0,
    )
    const usedCredits = totalCredits - remainingCredits

    return {
      success: true,
      data: {
        totalCredits,
        usedCredits,
        remainingCredits,
        subscriptions,
      },
    }
  }

  // ===== 模型用量时间线 =====

  /**
   * 获取模型用量时间线
   *
   * 按模型分组的详细用量数据
   *
   * @param params 查询参数
   * @param params.startDate 开始日期
   * @param params.endDate 结束日期
   * @param params.granularity 时间粒度，默认 "day"
   */
  async getModelUsageTimeline(
    params: ModelUsageTimelineParams,
  ): Promise<ApiResult<ModelUsageTimelinePoint[]>> {
    const { startDate, endDate, granularity = 'day' } = params

    const startDateStr =
      startDate instanceof Date ? toLocalISOString(startDate) : startDate
    const endDateStr =
      endDate instanceof Date ? toLocalISOString(endDate) : endDate

    const searchParams = new URLSearchParams({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
    })

    const endpoint = `${API_ENDPOINTS.MODEL_USAGE_TIMELINE}?${searchParams.toString()}`
    return this.client.get<ModelUsageTimelinePoint[]>(endpoint)
  }

  // ===== API Key 管理 =====

  /**
   * 查询 API Key 列表
   *
   * @param params 查询参数
   * @param params.pageNum 页码，默认 1
   * @param params.pageSize 每页数量，默认 20
   * @param params.keyword 搜索关键词
   */
  async queryApiKeys(
    params: ApiKeyQueryParams = {},
  ): Promise<ApiResult<PagedResponse<ApiKeyInfo>>> {
    const { pageNum = 1, pageSize = 20, keyword } = params

    const body: Record<string, unknown> = {
      pageNum,
      pageSize,
    }

    if (keyword) {
      body.keyword = keyword
    }

    return this.client.post<PagedResponse<ApiKeyInfo>>(
      API_ENDPOINTS.API_KEY_QUERY,
      body,
    )
  }

  /**
   * 获取所有 API Key（自动分页）
   *
   * 会自动遍历所有分页获取完整列表
   */
  async getAllApiKeys(): Promise<ApiResult<ApiKeyInfo[]>> {
    const allKeys: ApiKeyInfo[] = []
    let pageNum = 1
    const pageSize = 100

    while (true) {
      const result = await this.queryApiKeys({ pageNum, pageSize })

      if (!result.success) {
        return {
          success: false,
          data: allKeys,
          message: result.message,
          error: result.error,
        }
      }

      allKeys.push(...result.data.list)

      if (pageNum >= result.data.pages) {
        break
      }

      pageNum++
    }

    return {
      success: true,
      data: allKeys,
    }
  }

  // ===== Credit 历史记录 =====

  /**
   * 获取 Credit 历史记录（范围查询）
   *
   * @param params 查询参数
   * @param params.startTime 开始时间
   * @param params.endTime 结束时间
   * @param params.pageNum 页码，默认 1
   * @param params.pageSize 每页数量，默认 20
   */
  async getCreditHistory(
    params: CreditHistoryParams,
  ): Promise<ApiResult<PagedResponse<CreditHistoryItem>>> {
    const { startTime, endTime, pageNum = 1, pageSize = 20 } = params

    const startTimeStr =
      startTime instanceof Date ? toLocalISOString(startTime) : startTime
    const endTimeStr =
      endTime instanceof Date ? toLocalISOString(endTime) : endTime

    const searchParams = new URLSearchParams({
      pageNum: String(pageNum),
      pageSize: String(pageSize),
      startTime: startTimeStr,
      endTime: endTimeStr,
    })

    const endpoint = `${API_ENDPOINTS.CREDIT_HISTORY_RANGE}?${searchParams.toString()}`
    const result = await this.client.get<CreditHistoryRawResponse>(endpoint)

    if (result.success) {
      return {
        success: true,
        data: result.data.history,
      }
    }

    return {
      success: false,
      data: null as never,
      message: result.message,
      error: result.error,
    }
  }

  /**
   * 获取所有 Credit 历史记录（自动分页）
   *
   * @param params 时间范围参数
   */
  async getAllCreditHistory(
    params: Omit<CreditHistoryParams, 'pageNum' | 'pageSize'>,
  ): Promise<ApiResult<CreditHistoryItem[]>> {
    const allHistory: CreditHistoryItem[] = []
    let pageNum = 1
    const pageSize = 100

    while (true) {
      const result = await this.getCreditHistory({
        ...params,
        pageNum,
        pageSize,
      })

      if (!result.success) {
        return {
          success: false,
          data: allHistory,
          message: result.message,
          error: result.error,
        }
      }

      allHistory.push(...result.data.list)

      if (pageNum >= result.data.pages) {
        break
      }

      pageNum++
    }

    return {
      success: true,
      data: allHistory,
    }
  }

  // ===== Codex Free 额度 =====

  /**
   * 获取 Codex Free 每日免费额度
   *
   * 88code 为所有用户提供的 Codex 每日免费额度
   * 额度每天 0:00 自动重置
   */
  async getCodexFreeQuota(): Promise<ApiResult<CodexFreeQuota>> {
    return this.client.get<CodexFreeQuota>(API_ENDPOINTS.CODEX_FREE_QUOTA)
  }
}
