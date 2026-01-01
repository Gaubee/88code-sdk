import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRelayPulseStatus } from "@gaubee/88code-sdk";
import type {
  RelayPulseBoard,
  RelayPulsePeriod,
  RelayPulseStatusEntry,
  RelayPulseStatusParams,
} from "@gaubee/88code-sdk";
import { usePollingSubscription } from "./use-polling-subscription";

export const relayPulseQueryKeys = {
  all: ["relaypulse"] as const,
  status: (params: RelayPulseStatusParams) =>
    [
      ...relayPulseQueryKeys.all,
      "status",
      params.period ?? "90m",
      params.board ?? "hot",
      params.provider ?? "",
      params.service ?? "",
      params.channel ?? "",
      params.category ?? "",
      params.sort ?? "",
    ] as const,
};

export interface UseRelayPulseStatusOptions {
  period?: RelayPulsePeriod;
  board?: RelayPulseBoard;
  provider?: string;
  service?: string;
  channel?: string;
  category?: string;
  sort?: string;
}

export function useRelayPulseStatus(options: UseRelayPulseStatusOptions = {}) {
  const queryKey = React.useMemo(
    () => relayPulseQueryKeys.status(options),
    [
      options.period,
      options.board,
      options.provider,
      options.service,
      options.channel,
      options.category,
      options.sort,
    ]
  );

  const queryFn = React.useCallback(async (): Promise<RelayPulseStatusEntry[]> => {
    const result = await getRelayPulseStatus(options);
    if (!result.success) {
      throw new Error(result.message || "获取 RelayPulse 状态失败");
    }
    return result.data;
  }, [
    options.period,
    options.board,
    options.provider,
    options.service,
    options.channel,
    options.category,
    options.sort,
  ]);

  usePollingSubscription(queryKey, queryFn, true);

  return useQuery({ queryKey, queryFn });
}

