/**
 * 全局设置 Store
 * 使用 localStorage 持久化
 */

import { useSyncExternalStore, useCallback } from 'react'

// ===== 类型定义 =====

export interface AppSettings {
  /** 自动刷新间隔 (毫秒) */
  autoRefreshInterval: number
  /** 是否启用 RelayPulse 服务状态监控 */
  relayPulseEnabled: boolean
  /** RelayPulse 自定义 API 地址（用于本地代理） */
  relayPulseBaseUrl: string
  /** 调试模式：显示轮询相关信息 */
  debugMode: boolean
}

/** RelayPulse 默认地址 */
export const RELAYPULSE_DEFAULT_URL = 'https://relaypulse.top'

// ===== 常量 =====

const STORAGE_KEY = '88code-settings'

/** 可选的刷新间隔 */
export const REFRESH_INTERVALS = [
  { value: 5000, label: '5 秒' },
  { value: 15000, label: '15 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 120000, label: '2 分钟' },
] as const

/** 默认设置 */
const DEFAULT_SETTINGS: AppSettings = {
  autoRefreshInterval: 5000, // 默认 5 秒
  relayPulseEnabled: false, // 默认关闭，需要本地代理
  relayPulseBaseUrl: '', // 空表示使用默认地址
  debugMode: false, // 默认关闭调试模式
}

// ===== Store 实现 =====

let settings: AppSettings = DEFAULT_SETTINGS
let initialized = false
const listeners = new Set<() => void>()

function loadSettings(): AppSettings {
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

function saveSettings(newSettings: AppSettings): void {
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

function getSnapshot(): AppSettings {
  ensureInitialized()
  return settings
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS
}

function emitChange(): void {
  for (const listener of listeners) {
    listener()
  }
}

// ===== 公共 API =====

export function updateSettings(partial: Partial<AppSettings>): void {
  settings = { ...settings, ...partial }
  saveSettings(settings)
  emitChange()
}

export function resetSettings(): void {
  settings = { ...DEFAULT_SETTINGS }
  saveSettings(settings)
  emitChange()
}

// ===== React Hook =====

export function useSettings() {
  const currentSettings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const update = useCallback((partial: Partial<AppSettings>) => {
    updateSettings(partial)
  }, [])

  const reset = useCallback(() => {
    resetSettings()
  }, [])

  const setRefreshInterval = useCallback((interval: number) => {
    updateSettings({ autoRefreshInterval: interval })
  }, [])

  return {
    settings: currentSettings,
    updateSettings: update,
    resetSettings: reset,
    setRefreshInterval,
  }
}
