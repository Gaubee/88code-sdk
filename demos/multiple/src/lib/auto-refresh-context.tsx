/**
 * 自动刷新 Context
 *
 * 提供全局刷新间隔设置（来自 settings-store）
 */

import * as React from 'react'
import { useSettings } from './settings-store'

const AutoRefreshIntervalContext = React.createContext(5000)

export function AutoRefreshIntervalProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { settings } = useSettings()
  return (
    <AutoRefreshIntervalContext.Provider value={settings.autoRefreshInterval}>
      {children}
    </AutoRefreshIntervalContext.Provider>
  )
}

export function useAutoRefreshInterval() {
  return React.useContext(AutoRefreshIntervalContext)
}
