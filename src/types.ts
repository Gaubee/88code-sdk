/**
 * 88Code SDK 类型定义
 * 基于 88code-cost 项目的类型系统
 */

/** 套餐计划信息 */
export interface SubscriptionPlan {
  id: number
  subscriptionName: string
  billingCycle: string
  cost: number
  features: string
  creditLimit: number
  planType: 'MONTHLY' | 'PAY_PER_USE'
}

/** 订阅信息 */
export interface Subscription {
  id: number
  employeeId: number
  employeeName: string
  employeeEmail: string
  currentCredits: number
  subscriptionPlanId: number
  subscriptionPlanName: string
  cost: number
  startDate: string
  endDate: string
  billingCycle: string
  billingCycleDesc: string
  remainingDays: number
  subscriptionStatus: string
  subscriptionPlan: SubscriptionPlan
  isActive: boolean
  autoRenew: boolean
  autoResetWhenZero: boolean
  lastCreditReset: string | null
  resetTimes: number
}

/** 登录用户信息 */
export interface LoginInfo {
  employeeId: number
  userType: string
  loginName: string
  actualName: string
  email: string
  token: string
  referralCode: string
}

/** Dashboard 概览统计 */
export interface DashboardOverview {
  totalApiKeys: number
  activeApiKeys: number
  totalRequestsUsed: number
  totalTokensUsed: number
  totalInputTokensUsed: number
  totalOutputTokensUsed: number
  totalCacheCreateTokensUsed: number
  totalCacheReadTokensUsed: number
  cost: number
}

/** Dashboard 最近活动 */
export interface DashboardActivity {
  requestsToday: number
  tokensToday: number
  inputTokensToday: number
  outputTokensToday: number
  cacheCreateTokensToday: number
  cacheReadTokensToday: number
  cost: number
}

/** Dashboard 数据 */
export interface DashboardData {
  overview: DashboardOverview
  recentActivity: DashboardActivity
}

/** 用量趋势数据点 */
export interface UsageTrendPoint {
  date: string
  label: string
  requests: number
  inputTokens: number
  outputTokens: number
  cacheCreateTokens: number
  cacheReadTokens: number
  cost: number
}

/** 88Code API 原始响应结构 */
export interface Code88Response<T> {
  code: number
  ok: boolean
  msg: string
  data: T
  dataType: number
}

/** SDK 统一响应结构 */
export interface ApiResult<T> {
  success: boolean
  data: T
  message?: string
  error?: unknown
}

/** SDK 配置选项 */
export interface Code88Config {
  /** API 基础 URL，默认 https://www.88code.ai */
  baseUrl?: string
  /** 认证 Token */
  authToken: string
  /** 是否启用调试日志 */
  debug?: boolean
}

/** 用量趋势查询参数 */
export interface UsageTrendParams {
  /** 查询天数，默认 30 */
  days?: number
  /** 时间粒度 */
  granularity?: 'day' | 'week' | 'month'
}

// ===== 模型用量时间线 =====

/** 模型用量时间线查询参数 */
export interface ModelUsageTimelineParams {
  /** 开始日期 (ISO 8601 格式) */
  startDate: string | Date
  /** 结束日期 (ISO 8601 格式) */
  endDate: string | Date
  /** 时间粒度 */
  granularity?: 'day' | 'week' | 'month'
}

/** 模型用量数据 (单个模型) */
export interface ModelUsageData {
  /** 请求的模型名称 */
  model: string
  /** 实际使用的模型名称 */
  actualModel: string
  /** 请求数 */
  requests: number
  /** Token 数 */
  tokens: number
  /** 费用 */
  cost: number
}

/** 模型用量时间线数据点 (按日期分组) */
export interface ModelUsageTimelinePoint {
  /** 日期 (如 2025-12-01) */
  date: string
  /** 显示标签 (如 12/01) */
  label: string
  /** 该日期下各模型的用量 */
  models: ModelUsageData[]
  /** 总请求数 */
  totalRequests: number
  /** 总 Token 数 */
  totalTokens: number
  /** 总费用 */
  totalCost: number
}

// ===== API Key 管理 =====

/** API Key 查询参数 */
export interface ApiKeyQueryParams {
  /** 页码，默认 1 */
  pageNum?: number
  /** 每页数量，默认 20 */
  pageSize?: number
  /** 搜索关键词 */
  keyword?: string
}

/** API Key 信息 */
export interface ApiKeyInfo {
  id: number
  employeeId: number
  /** API Key 的 keyId (唯一标识) */
  keyId: string
  /** API Key 名称 */
  name: string | null
  /** 脱敏后的 API Key (如 88_c9f5****f7a6) */
  maskedApiKey: string
  /** 前缀 (如 88_) */
  prefix: string
  /** 是否活跃 */
  isActive: boolean
  /** 创建时间 */
  createdAt: string
  /** 最后使用时间 */
  lastUsedAt: string | null
  /** 过期时间 */
  expiresAt: string | null
  /** 总请求数 */
  totalRequests: number
  /** 总 Token 数 */
  totalTokens: number
  /** 总费用 */
  totalCost: number
  /** 描述 */
  description: string | null
  // 以下字段 API 返回但可能为 null
  apiKey: string | null
  claudeAccountId: string | null
  geminiAccountId: string | null
  openaiAccountId: string | null
  concurrencyLimit: number | null
  creditLimit: number | null
  currentCredits: number | null
  currentConcurrency: number | null
  dailyCost: number | null
  subscriptionId: number | null
  subscriptionName: string | null
}

/** 分页响应结构 */
export interface PagedResponse<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
}

// ===== Credit 历史记录 =====

// ===== Codex Free 额度 =====

/** Codex Free 额度信息 */
export interface CodexFreeQuota {
  /** 订阅 ID */
  subscriptionId: number
  /** 订阅等级 (如 PRO, PAYGO, FREE) */
  subscriptionLevel: string
  /** 是否启用 */
  enabled: boolean
  /** 每日额度 */
  dailyQuota: number
  /** 已用额度 */
  usedQuota: number
  /** 剩余额度 */
  remainingQuota: number
  /** 使用百分比 */
  usagePercent: number
  /** 是否超额 */
  exceeded: boolean
}

/** Credit 历史查询参数 */
export interface CreditHistoryParams {
  /** 页码，默认 1 */
  pageNum?: number
  /** 每页数量，默认 20 */
  pageSize?: number
  /** 开始时间 (ISO 8601 格式) */
  startTime: string | Date
  /** 结束时间 (ISO 8601 格式) */
  endTime: string | Date
}

/** Credit 历史记录项 */
export interface CreditHistoryItem {
  id: number
  employeeId: number
  subscriptionId: number
  subscriptionName: string
  /** 操作类型 (如 API_CALL) */
  operationType: string
  /** 操作类型描述 (如 "API调用") */
  operationTypeDesc: string
  /** Credit 变化 (负数表示消耗) */
  creditChange: number
  /** 变化前余额 */
  creditsBefore: number
  /** 变化后余额 */
  creditsAfter: number
  /** Credit 额度 */
  creditLimit: number
  /** 剩余额度 */
  remainingCredits: number
  /** 使用的 Credits */
  creditsUsed: number
  /** 描述 */
  description: string
  /** 创建时间 */
  createdAt: string
  // API 调用相关字段
  /** 请求模型 */
  requestModel: string | null
  /** 总费用 */
  totalCost: number | null
  /** 输入 Token */
  inputTokens: number | null
  /** 输出 Token */
  outputTokens: number | null
  /** 缓存创建 Token */
  cacheCreateTokens: number | null
  /** 缓存读取 Token */
  cacheReadTokens: number | null
  /** 倍率 */
  multiplier: number | null
  /** API Key 名称 */
  keyName: string | null
  /** 套餐类型 */
  planType: string | null
  /** 账户 ID */
  accountId: string | null
  /** Session ID */
  sessionId: string | null
  /** 客户端 IP */
  clientIp: string | null
}

/** Credit 历史原始响应结构 */
export interface CreditHistoryRawResponse {
  history: PagedResponse<CreditHistoryItem>
  accountDetails: Record<string, unknown>
}
