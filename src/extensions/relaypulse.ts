import type { ApiResult } from "../types.ts";

export const RELAYPULSE_BASE_URL = "https://relaypulse.top";

export type RelayPulseBoard = "hot" | "cold" | "all";

/**
 * period 表示时间范围，同时隐含聚合粒度：
 * - 90m：按分钟级（当前接口返回 2min 一条）
 * - 24h / 1d：按小时级
 * - 7d / 30d：按天级
 */
export type RelayPulsePeriod = "90m" | "24h" | "1d" | "7d" | "30d";

export interface RelayPulseBadge {
  id: string;
  kind: string;
  variant: string;
}

export interface RelayPulseStatusCounts {
  available: number;
  degraded: number;
  unavailable: number;
  missing: number;
  slow_latency: number;
  rate_limit: number;
  server_error: number;
  client_error: number;
  auth_error: number;
  invalid_request: number;
  network_error: number;
  content_mismatch: number;
  http_code_breakdown?: Record<string, Record<string, number>>;
}

export interface RelayPulseTimelinePoint {
  time: string;
  timestamp: number;
  status: number;
  latency: number;
  /** 0-100 */
  availability: number;
  status_counts: RelayPulseStatusCounts;
}

export interface RelayPulseCurrentStatus {
  status: number;
  latency: number;
  timestamp: number;
}

export interface RelayPulseStatusEntry {
  provider: string;
  provider_slug: string;
  provider_url: string;
  service: string;
  category: string;
  sponsor: string;
  sponsor_url: string;
  sponsor_level: string;
  badges: RelayPulseBadge[];
  price_min: number;
  price_max: number;
  listed_days: number;
  channel: string;
  board: string;
  probe_url: string;
  template_name: string;
  interval_ms: number;
  current_status: RelayPulseCurrentStatus;
  timeline: RelayPulseTimelinePoint[];
}

export interface RelayPulseStatusParams {
  period?: RelayPulsePeriod;
  board?: RelayPulseBoard;
  provider?: string;
  service?: string;
  category?: string;
  sort?: string;
  channel?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getRelayPulseStatus(
  params: RelayPulseStatusParams = {},
  options: { baseUrl?: string; signal?: AbortSignal } = {}
): Promise<ApiResult<RelayPulseStatusEntry[]>> {
  const baseUrl = options.baseUrl ?? RELAYPULSE_BASE_URL;
  const url = new URL("/api/status", baseUrl);

  if (params.period) url.searchParams.set("period", params.period);
  if (params.board) url.searchParams.set("board", params.board);
  if (params.provider) url.searchParams.set("provider", params.provider);
  if (params.service) url.searchParams.set("service", params.service);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.channel) url.searchParams.set("channel", params.channel);

  try {
    const response = await fetch(url.toString(), { signal: options.signal });
    const json: unknown = await response.json();

    if (!isObject(json)) {
      return { success: false, data: [], message: "RelayPulse 响应格式错误", error: json };
    }

    if ("error" in json && typeof json.error === "string") {
      return { success: false, data: [], message: json.error, error: json };
    }

    if (!("data" in json) || !Array.isArray(json.data)) {
      return { success: false, data: [], message: "RelayPulse 响应缺少 data 字段", error: json };
    }

    return { success: true, data: json.data as RelayPulseStatusEntry[] };
  } catch (error) {
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : "RelayPulse 请求失败",
      error,
    };
  }
}

