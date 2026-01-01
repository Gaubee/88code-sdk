import * as React from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useService } from "./service-context";
import { useAutoRefreshEnabled } from "./auto-refresh-context";

/**
 * 将 Query 与 PollingManager 绑定：组件存在即订阅、卸载即取消订阅。
 *
 * - 不使用 setInterval
 * - 轮询节奏由 PollingManager 基于 "lastRequestAt + interval" 控制
 * - enabled 来自页面级 AutoRefreshEnabledContext
 */
export function usePollingSubscription(
  queryKey: QueryKey,
  queryFn: () => Promise<unknown>,
  queryEnabled: boolean
) {
  const { pollingManager } = useService();
  const autoRefreshEnabled = useAutoRefreshEnabled();

  // 组合：query 本身要 enabled，且页面级 autoRefresh 也要 enabled
  const enabled = queryEnabled && autoRefreshEnabled;

  // 使用 ref 保持最新的 queryKey 和 queryFn，避免 effect 依赖变化
  const queryKeyRef = React.useRef(queryKey);
  const queryFnRef = React.useRef(queryFn);
  queryKeyRef.current = queryKey;
  queryFnRef.current = queryFn;

  React.useEffect(() => {
    // 始终订阅，把 enabled 传给 PollingManager 让它控制是否轮询
    return pollingManager.subscribe(
      queryKeyRef.current,
      () => queryFnRef.current(),
      enabled
    );
  }, [enabled, pollingManager]);
}
