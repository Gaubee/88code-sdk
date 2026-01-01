/**
 * 智能自动重置策略
 *
 * 基于 88code-cost 项目的重置策略:
 * - 18:55 优先策略：保留最后一次机会给夜间窗口
 * - 23:55 兜底策略：确保每日重置
 */

import type { Subscription } from "../types.ts";

export interface ResetDecision {
  shouldReset: boolean;
  reason: string;
}

/** 重置时间窗口配置 */
export interface ResetWindow {
  hour: number;
  minute: number;
  requiredResetTimes: number;
  label: string;
}

/** 预设的重置时间窗口 */
export const RESET_WINDOWS: readonly ResetWindow[] = [
  { hour: 18, minute: 55, requiredResetTimes: 2, label: "evening" },
  { hour: 23, minute: 55, requiredResetTimes: 1, label: "night" },
] as const;

/** 冷却时间 (5 小时) */
export const RESET_COOLDOWN_MS = 5 * 60 * 60 * 1000;

/** 重置窗口持续时间 (5 分钟) */
export const RESET_WINDOW_DURATION_MS = 5 * 60 * 1000;

/**
 * 判断套餐是否需要重置
 *
 * 策略:
 * - 18:55 窗口：若重置次数 > 1 则重置，否则保留给 23:55
 * - 23:55 窗口：无条件重置（兜底）
 *
 * @param subscription 订阅信息
 * @param currentHour 当前小时 (0-23)
 */
export function shouldResetSubscription(
  subscription: Subscription,
  currentHour: number
): ResetDecision {
  const { currentCredits, resetTimes, subscriptionPlan } = subscription;
  const creditLimit = subscriptionPlan.creditLimit;

  if (currentCredits >= creditLimit) {
    return {
      shouldReset: false,
      reason: `已满额 (${currentCredits}/${creditLimit})`,
    };
  }

  if (resetTimes <= 0) {
    return {
      shouldReset: false,
      reason: "无剩余重置次数",
    };
  }

  if (currentHour === 18) {
    if (resetTimes <= 1) {
      return {
        shouldReset: false,
        reason: `保留最后1次重置机会给晚间 (剩余${resetTimes}次)`,
      };
    }

    return {
      shouldReset: true,
      reason: `最大化利用重置窗口，剩余${resetTimes}次`,
    };
  }

  if (currentHour === 23) {
    return {
      shouldReset: true,
      reason: `兜底重置，剩余${resetTimes}次`,
    };
  }

  return { shouldReset: false, reason: "不在执行时间窗口" };
}

/**
 * 检查是否满足重置条件
 */
export interface ResetEligibility {
  canReset: boolean;
  reason?: string;
  cooldownEnd?: number;
}

/**
 * 检查订阅是否可以重置
 *
 * @param subscription 订阅信息
 * @param requiredResetTimes 需要的最低重置次数
 */
export function canReset(
  subscription: Subscription,
  requiredResetTimes: number = 1
): ResetEligibility {
  const { currentCredits, subscriptionPlan, resetTimes, lastCreditReset, subscriptionPlanName } =
    subscription;
  const creditLimit = subscriptionPlan.creditLimit;

  // PAYGO 套餐不支持定时重置
  if (subscriptionPlanName === "PAYGO" || subscriptionPlan.planType === "PAY_PER_USE") {
    return { canReset: false, reason: "PAYGO 套餐不支持定时重置" };
  }

  // 检查额度是否满额
  if (currentCredits >= creditLimit) {
    return { canReset: false, reason: "额度已满" };
  }

  // 检查重置次数
  if (resetTimes < requiredResetTimes) {
    return {
      canReset: false,
      reason: `重置次数不足（需要 ${requiredResetTimes} 次，当前 ${resetTimes} 次）`,
    };
  }

  // 检查冷却时间
  if (lastCreditReset) {
    const lastResetTime = new Date(lastCreditReset).getTime();
    const timeSinceLastReset = Date.now() - lastResetTime;

    if (timeSinceLastReset < RESET_COOLDOWN_MS) {
      const cooldownEnd = lastResetTime + RESET_COOLDOWN_MS;
      const remainingCooldown = cooldownEnd - Date.now();
      const remainingHours = Math.ceil(remainingCooldown / (60 * 60 * 1000));
      return {
        canReset: false,
        reason: `冷却中（剩余 ${Math.max(1, remainingHours)} 小时）`,
        cooldownEnd,
      };
    }
  }

  return { canReset: true };
}

/**
 * 根据时间获取对应的重置窗口
 */
export function getResetWindowByTime(hour: number, minute: number): ResetWindow | null {
  return (
    RESET_WINDOWS.find((window) => window.hour === hour && window.minute === minute) ?? null
  );
}

/**
 * 获取当前时间所在的重置窗口（如果在窗口内）
 */
export function getCurrentResetWindow(): ResetWindow | null {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  for (const window of RESET_WINDOWS) {
    // 检查是否在 5 分钟窗口内
    if (hour === window.hour && minute >= window.minute && minute < window.minute + 5) {
      return window;
    }
  }

  return null;
}

/**
 * 获取下一个重置时间点
 */
export function getNextResetTime(): { time: Date; window: ResetWindow } | null {
  const now = new Date();

  for (const window of RESET_WINDOWS) {
    const target = new Date(now);
    target.setHours(window.hour, window.minute, 0, 0);

    if (target > now) {
      return { time: target, window };
    }
  }

  // 今天的窗口都过了，返回明天第一个窗口
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(RESET_WINDOWS[0].hour, RESET_WINDOWS[0].minute, 0, 0);

  return { time: tomorrow, window: RESET_WINDOWS[0] };
}

/**
 * 计算距离下次重置的毫秒数
 */
export function getTimeUntilNextReset(): number {
  const next = getNextResetTime();
  if (!next) return 0;
  return next.time.getTime() - Date.now();
}

/**
 * 格式化倒计时
 */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "即将重置";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天${hours % 24}时`;
  } else if (hours > 0) {
    return `${hours}时${minutes % 60}分`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 检查订阅是否已在当前窗口内重置过
 */
export function hasResetInCurrentWindow(
  subscription: Subscription,
  windowStart: Date
): boolean {
  if (!subscription.lastCreditReset) {
    return false;
  }
  const lastReset = new Date(subscription.lastCreditReset);
  return lastReset >= windowStart;
}
