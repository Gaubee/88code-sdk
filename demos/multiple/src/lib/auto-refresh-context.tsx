/**
 * 自动刷新 Context
 *
 * 分离两个关注点：
 * - interval: 全局设置控制（来自 settings-store）
 * - enabled: 页面级控制（通过 Provider 注入）
 */

import * as React from "react";
import { useSettings } from "./settings-store";

// ===== Interval Context (全局) =====

const AutoRefreshIntervalContext = React.createContext(5000);

export function AutoRefreshIntervalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings } = useSettings();
  return (
    <AutoRefreshIntervalContext.Provider value={settings.autoRefreshInterval}>
      {children}
    </AutoRefreshIntervalContext.Provider>
  );
}

export function useAutoRefreshInterval() {
  return React.useContext(AutoRefreshIntervalContext);
}

// ===== Enabled Context (页面级) =====

const AutoRefreshEnabledContext = React.createContext(true);

export function AutoRefreshEnabledProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AutoRefreshEnabledContext.Provider value={enabled}>
      {children}
    </AutoRefreshEnabledContext.Provider>
  );
}

export function useAutoRefreshEnabled() {
  return React.useContext(AutoRefreshEnabledContext);
}

// ===== 组合 Hook =====

export function useAutoRefresh() {
  const interval = React.useContext(AutoRefreshIntervalContext);
  const enabled = React.useContext(AutoRefreshEnabledContext);
  return { enabled, interval };
}
