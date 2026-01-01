/**
 * 智能自动重置设置 Store
 * 每个订阅可以单独启用/禁用
 */

import { useSyncExternalStore, useCallback } from 'react'

// ===== 类型定义 =====

export interface AutoResetSettings {
  /** 全局开关 */
  enabled: boolean
  /** 每个订阅的启用状态 (subscriptionId -> enabled) */
  subscriptionSettings: Record<number, boolean>
  /** 上次执行结果 */
  lastExecution?: {
    timestamp: string
    window: string
    results: Array<{
      subscriptionId: number
      subscriptionName: string
      success: boolean
      reason: string
    }>
  }
}

// ===== 常量 =====

const STORAGE_KEY = '88code-auto-reset'

const DEFAULT_SETTINGS: AutoResetSettings = {
  enabled: false,
  subscriptionSettings: {},
}

// ===== Store 实现 =====

let settings: AutoResetSettings = DEFAULT_SETTINGS
let initialized = false
const listeners = new Set<() => void>()

function loadSettings(): AutoResetSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // 忽略解析错误
  }
  return DEFAULT_SETTINGS
}

function ensureInitialized(): void {
  if (!initialized && typeof window !== 'undefined') {
    settings = loadSettings()
    initialized = true
  }
}

function saveSettings(newSettings: AutoResetSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  } catch {
    // 忽略存储错误
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): AutoResetSettings {
  ensureInitialized()
  return settings
}

function getServerSnapshot(): AutoResetSettings {
  return DEFAULT_SETTINGS
}

function emitChange(): void {
  for (const listener of listeners) {
    listener()
  }
}

// ===== 公共 API =====

export function updateAutoResetSettings(
  partial: Partial<AutoResetSettings>,
): void {
  settings = { ...settings, ...partial }
  saveSettings(settings)
  emitChange()
}

export function setSubscriptionAutoReset(
  subscriptionId: number,
  enabled: boolean,
): void {
  settings = {
    ...settings,
    subscriptionSettings: {
      ...settings.subscriptionSettings,
      [subscriptionId]: enabled,
    },
  }
  saveSettings(settings)
  emitChange()
}

export function isSubscriptionAutoResetEnabled(
  subscriptionId: number,
): boolean {
  ensureInitialized()
  if (!settings.enabled) return false
  return settings.subscriptionSettings[subscriptionId] ?? false
}

export function setLastExecution(
  execution: AutoResetSettings['lastExecution'],
): void {
  settings = { ...settings, lastExecution: execution }
  saveSettings(settings)
  emitChange()
}

export function getAutoResetSettings(): AutoResetSettings {
  ensureInitialized()
  return settings
}

// ===== React Hook =====

export function useAutoResetSettings() {
  const currentSettings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const toggleGlobal = useCallback(() => {
    updateAutoResetSettings({ enabled: !currentSettings.enabled })
  }, [currentSettings.enabled])

  const setEnabled = useCallback((enabled: boolean) => {
    updateAutoResetSettings({ enabled })
  }, [])

  const toggleSubscription = useCallback(
    (subscriptionId: number) => {
      const current =
        currentSettings.subscriptionSettings[subscriptionId] ?? false
      setSubscriptionAutoReset(subscriptionId, !current)
    },
    [currentSettings.subscriptionSettings],
  )

  const setSubscriptionEnabled = useCallback(
    (subscriptionId: number, enabled: boolean) => {
      setSubscriptionAutoReset(subscriptionId, enabled)
    },
    [],
  )

  const isEnabled = useCallback(
    (subscriptionId: number) => {
      if (!currentSettings.enabled) return false
      return currentSettings.subscriptionSettings[subscriptionId] ?? false
    },
    [currentSettings.enabled, currentSettings.subscriptionSettings],
  )

  return {
    settings: currentSettings,
    toggleGlobal,
    setEnabled,
    toggleSubscription,
    setSubscriptionEnabled,
    isEnabled,
    lastExecution: currentSettings.lastExecution,
  }
}
