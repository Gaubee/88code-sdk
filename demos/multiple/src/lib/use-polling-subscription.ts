import * as React from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useService } from "./service-context";

/**
 * 将 Query 与 PollingManager 绑定：组件存在即订阅、卸载即取消订阅。
 *
 * - 不使用 setInterval
 * - 轮询节奏由 PollingManager 基于 “lastRequestAt + interval” 控制
 */
export function usePollingSubscription(
  queryKey: QueryKey,
  queryFn: () => Promise<unknown>,
  enabled: boolean
) {
  const { pollingManager } = useService();

  React.useEffect(() => {
    if (!enabled) return;
    return pollingManager.subscribe(queryKey, queryFn);
  }, [enabled, pollingManager, queryFn, queryKey]);
}

