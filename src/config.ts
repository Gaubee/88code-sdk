/**
 * 88Code SDK 配置
 */

/** 默认 API 基础 URL */
export const DEFAULT_BASE_URL = "https://www.88code.ai";

/** API 端点定义 */
export const API_ENDPOINTS = {
  // ===== 认证相关 =====
  /** 获取登录信息 */
  LOGIN_INFO: "/admin-api/login/getLoginInfo",

  // ===== 订阅管理 =====
  /** 获取我的订阅列表 */
  SUBSCRIPTIONS: "/admin-api/cc-admin/system/subscription/my",
  /** 切换自动重置（需要 subscriptionId） */
  AUTO_RESET: (subscriptionId: number) =>
    `/admin-api/cc-admin/system/subscription/my/auto-reset/${subscriptionId}`,
  /** 手动重置额度（需要 subscriptionId） */
  RESET_CREDITS: (subscriptionId: number) =>
    `/admin-api/cc-admin/system/subscription/my/reset-credits/${subscriptionId}`,

  // ===== 数据统计 =====
  /** 获取仪表盘数据 */
  DASHBOARD: "/admin-api/cc-admin/user/dashboard",
  /** 获取使用趋势 */
  USAGE_TREND: "/admin-api/cc-admin/user/usage-trend",
  /** 获取模型用量时间线 */
  MODEL_USAGE_TIMELINE: "/admin-api/cc-admin/user/model-usage-timeline",

  // ===== API Key 管理 =====
  /** 查询 API Key 列表 */
  API_KEY_QUERY: "/admin-api/cc-admin/api-key/query",

  // ===== Credit 历史 =====
  /** 获取 Credit 历史记录（范围查询） */
  CREDIT_HISTORY_RANGE:
    "/admin-api/cc-admin/system/subscription/my/credit-history/range",

  // ===== Codex Free 额度 =====
  /** 获取 Codex Free 每日免费额度 */
  CODEX_FREE_QUOTA:
    "/admin-api/cc-admin/system/subscription/codex-free-quota",
} as const;
