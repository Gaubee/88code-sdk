/**
 * 88Code SDK for Node.js/TypeScript
 *
 * 基于 88code-cost 项目封装的 88Code API SDK
 *
 * @module
 *
 * @example 基本使用
 * ```ts
 * import { Code88Client, Code88Queries } from "@gaubee/88code-sdk";
 *
 * const client = new Code88Client({
 *   authToken: process.env.CODE88_AUTH_TOKEN!,
 *   debug: true,
 * });
 *
 * const queries = new Code88Queries(client);
 *
 * // 获取用户信息
 * const userInfo = await queries.getLoginInfo();
 * console.log(userInfo.data);
 *
 * // 获取订阅信息
 * const subscriptions = await queries.getSubscriptions();
 * console.log(subscriptions.data);
 * ```
 *
 * @example 危险操作（需显式确认）
 * ```ts
 * import { Code88Client, createMutations } from "@gaubee/88code-sdk";
 *
 * const client = new Code88Client({ authToken: "..." });
 * const mutations = createMutations(client, "I_UNDERSTAND_THE_RISKS");
 *
 * // ⚠️ 重置额度
 * await mutations.resetCredits(123);
 * ```
 */

// 核心客户端
export { Code88Client } from "./client.ts";

// 只读查询（安全）
export { Code88Queries } from "./queries.ts";

// 危险操作（隔离）
export { Code88Mutations, createMutations } from "./mutations.ts";
export type { MutationResult } from "./mutations.ts";

// 配置
export { API_ENDPOINTS, DEFAULT_BASE_URL } from "./config.ts";

// 类型导出
export type {
  ApiKeyInfo,
  ApiKeyQueryParams,
  ApiResult,
  Code88Config,
  Code88Response,
  CodexFreeQuota,
  CreditHistoryItem,
  CreditHistoryParams,
  DashboardActivity,
  DashboardData,
  DashboardOverview,
  LoginInfo,
  ModelUsageData,
  ModelUsageTimelineParams,
  ModelUsageTimelinePoint,
  PagedResponse,
  Subscription,
  SubscriptionPlan,
  UsageTrendParams,
  UsageTrendPoint,
} from "./types.ts";

import { Code88Client } from "./client.ts";
import { Code88Queries } from "./queries.ts";

/**
 * 便捷函数：从环境变量创建客户端和查询实例
 *
 * @param envKey 环境变量名，默认 "CODE88_AUTH_TOKEN"
 */
export function createFromEnv(envKey = "CODE88_AUTH_TOKEN"): {
  client: Code88Client;
  queries: Code88Queries;
} {
  const authToken = process.env[envKey];

  if (!authToken) {
    throw new Error(`环境变量 ${envKey} 未设置。请设置您的 88Code authToken。`);
  }

  const client = new Code88Client({ authToken });
  const queries = new Code88Queries(client);

  return { client, queries };
}
