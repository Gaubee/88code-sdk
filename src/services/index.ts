/**
 * 88Code SDK Services
 *
 * 智能自动重置相关服务
 */

export {
  shouldResetSubscription,
  canReset,
  getResetWindowByTime,
  getCurrentResetWindow,
  getNextResetTime,
  getTimeUntilNextReset,
  formatCountdown,
  hasResetInCurrentWindow,
  RESET_WINDOWS,
  RESET_COOLDOWN_MS,
  RESET_WINDOW_DURATION_MS,
  type ResetDecision,
  type ResetEligibility,
  type ResetWindow,
} from "./reset-strategy.ts";

export {
  SmartResetScheduler,
  createSmartResetScheduler,
  type ResetTaskResult,
  type SchedulerExecutionResult,
  type SmartResetSchedulerConfig,
} from "./smart-reset-scheduler.ts";
