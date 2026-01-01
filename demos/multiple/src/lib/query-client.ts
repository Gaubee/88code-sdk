import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 由 PollingManager 负责“按上次请求时间”刷新；这里保持数据尽量常驻用于 tab 切换瞬显
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});
