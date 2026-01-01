import * as React from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useService } from "./service-context";

/**
 * 将 Query 与 PollingManager 绑定：组件存在即订阅、卸载即取消订阅。
 *
 * - 不使用 setInterval
 * - 轮询节奏由 PollingManager 基于 "lastRequestAt + interval" 控制
 */
export function usePollingSubscription(
  queryKey: QueryKey,
  queryFn: () => Promise<unknown>,
  enabled: boolean
) {
  const { pollingManager } = useService();

  // 使用 ref 保持最新的 queryKey 和 queryFn，避免 effect 依赖变化
  const queryKeyRef = React.useRef(queryKey);
  const queryFnRef = React.useRef(queryFn);
  queryKeyRef.current = queryKey;
  queryFnRef.current = queryFn;

  React.useEffect(() => {
    if (!enabled) return;

    // 使用 ref 中的值，这样 effect 只在 enabled/pollingManager 变化时重新执行
    return pollingManager.subscribe(
      queryKeyRef.current,
      () => queryFnRef.current()
    );
  }, [enabled, pollingManager]);
}
