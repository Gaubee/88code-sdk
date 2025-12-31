/**
 * 88Code SDK - 危险操作模块（需谨慎使用）
 *
 * ⚠️ 警告：此模块包含会修改数据的操作
 *
 * 包含的操作：
 * - resetCredits: 重置订阅额度（每日有次数限制）
 * - toggleAutoReset: 切换自动重置开关
 *
 * 建议：
 * - 生产环境谨慎使用
 * - 测试时请确认操作的影响
 * - 重置操作有冷却时间限制
 */

import { Code88Client } from "./client.ts";
import { API_ENDPOINTS } from "./config.ts";
import type { ApiResult } from "./types.ts";

/**
 * 危险操作返回结果
 */
export interface MutationResult {
  success: boolean;
  message?: string;
}

/**
 * 危险操作 API
 *
 * ⚠️ 此类包含会修改服务器数据的操作，请谨慎使用
 *
 * @example
 * ```ts
 * const client = new Code88Client({ authToken: "your-token" });
 * const mutations = new Code88Mutations(client);
 *
 * // ⚠️ 重置订阅额度（危险操作）
 * const result = await mutations.resetCredits(123);
 *
 * // ⚠️ 切换自动重置开关（危险操作）
 * const toggleResult = await mutations.toggleAutoReset(123, true);
 * ```
 */
export class Code88Mutations {
  constructor(private client: Code88Client) {
    console.warn(
      "[88code-sdk] ⚠️ Code88Mutations 已初始化。请注意：此模块包含会修改数据的危险操作。"
    );
  }

  /**
   * ⚠️ 重置订阅额度
   *
   * 警告：
   * - 此操作会重置指定订阅的额度到初始值
   * - 每日有重置次数限制
   * - 操作后有冷却时间
   *
   * @param subscriptionId 订阅 ID
   */
  async resetCredits(subscriptionId: number): Promise<ApiResult<MutationResult>> {
    console.warn(
      `[88code-sdk] ⚠️ 正在执行危险操作: resetCredits(${subscriptionId})`
    );

    const endpoint = API_ENDPOINTS.RESET_CREDITS(subscriptionId);
    const result = await this.client.post<MutationResult>(endpoint);

    if (result.success) {
      console.log(`[88code-sdk] ✅ 额度重置成功: subscriptionId=${subscriptionId}`);
    } else {
      console.error(
        `[88code-sdk] ❌ 额度重置失败: ${result.message}`
      );
    }

    return result;
  }

  /**
   * ⚠️ 切换自动重置开关
   *
   * 警告：
   * - 此操作会修改订阅的自动重置设置
   * - 开启后，当额度为0时会自动触发重置
   *
   * @param subscriptionId 订阅 ID
   * @param autoResetWhenZero 是否在额度为0时自动重置
   */
  async toggleAutoReset(
    subscriptionId: number,
    autoResetWhenZero: boolean
  ): Promise<ApiResult<MutationResult>> {
    console.warn(
      `[88code-sdk] ⚠️ 正在执行危险操作: toggleAutoReset(${subscriptionId}, ${autoResetWhenZero})`
    );

    const endpoint = `${API_ENDPOINTS.AUTO_RESET(subscriptionId)}?autoResetWhenZero=${autoResetWhenZero}`;
    const result = await this.client.post<MutationResult>(endpoint);

    if (result.success) {
      console.log(
        `[88code-sdk] ✅ 自动重置设置已更新: subscriptionId=${subscriptionId}, autoResetWhenZero=${autoResetWhenZero}`
      );
    } else {
      console.error(
        `[88code-sdk] ❌ 自动重置设置失败: ${result.message}`
      );
    }

    return result;
  }
}

/**
 * 创建一个受保护的 Mutations 实例
 *
 * 需要显式确认才能创建，增加安全性
 *
 * @param client Code88Client 实例
 * @param confirm 确认字符串，必须为 "I_UNDERSTAND_THE_RISKS"
 */
export function createMutations(
  client: Code88Client,
  confirm: "I_UNDERSTAND_THE_RISKS"
): Code88Mutations {
  if (confirm !== "I_UNDERSTAND_THE_RISKS") {
    throw new Error(
      '创建 Mutations 实例需要确认字符串 "I_UNDERSTAND_THE_RISKS"'
    );
  }
  return new Code88Mutations(client);
}
