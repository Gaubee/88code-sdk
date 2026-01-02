/**
 * 刷新 Context
 *
 * - 提供全局 interval 配置
 * - 订阅自注册机制，页面刷新按钮可一键刷新所有活跃订阅
 */

import * as React from 'react'
import { useSettings } from './settings-store'

type RefetchFn = () => unknown

type Entry = {
  refetch: RefetchFn
  count: number
}

interface RefreshContextValue {
  interval: number
  register: (key: string, refetch: RefetchFn) => () => void
  refreshAll: () => void
  subscriberCount: number
}

const RefreshContext = React.createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const subscribersRef = React.useRef(new Map<string, Entry>())
  const [subscriberCount, setSubscriberCount] = React.useState(0)

  const register = React.useCallback((key: string, refetch: RefetchFn) => {
    const existing = subscribersRef.current.get(key)
    if (existing) {
      existing.count += 1
      existing.refetch = refetch
    } else {
      subscribersRef.current.set(key, { refetch, count: 1 })
    }
    setSubscriberCount(subscribersRef.current.size)

    return () => {
      const current = subscribersRef.current.get(key)
      if (!current) return
      current.count = Math.max(0, current.count - 1)
      if (current.count === 0) {
        subscribersRef.current.delete(key)
      }
      setSubscriberCount(subscribersRef.current.size)
    }
  }, [])

  const refreshAll = React.useCallback(() => {
    for (const entry of subscribersRef.current.values()) {
      entry.refetch()
    }
  }, [])

  const value = React.useMemo<RefreshContextValue>(
    () => ({
      interval: settings.autoRefreshInterval,
      register,
      refreshAll,
      subscriberCount,
    }),
    [settings.autoRefreshInterval, register, refreshAll, subscriberCount],
  )

  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  )
}

export function useRefresh() {
  const context = React.useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within RefreshProvider')
  }
  return context
}

/**
 * 自动注册订阅到 RefreshContext
 */
export function useRegisterRefetch(
  key: string,
  refetch: RefetchFn,
  enabled: boolean,
) {
  const { register } = useRefresh()

  React.useEffect(() => {
    if (!enabled) return
    if (!key) return
    return register(key, refetch)
  }, [enabled, key, refetch, register])
}
