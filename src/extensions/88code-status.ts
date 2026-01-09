import type { ApiResult } from '../types.ts'

export const OFFICIAL_STATUS_API_URL =
  'https://www.88code.org/status-api/api/v1/status'

export type OfficialStatusType = 'operational' | 'degraded' | 'error'

export interface OfficialStatusLatest {
  status: OfficialStatusType
  latency_ms: number | null
  ping_latency_ms: number
  checked_at: string
  message: string
  retry_count?: number
}

export interface OfficialStatusStatistics {
  total_checks: number
  operational_count: number
  degraded_count: number
  failed_count: number
  validation_failed_count: number
  success_rate: number
  avg_latency_ms: number
  min_latency_ms: number
  max_latency_ms: number
}

export interface OfficialStatusTimelinePoint {
  status: OfficialStatusType
  latency_ms: number | null
  ping_latency_ms: number
  checked_at: string
  message: string
  retry_count?: number
}

export interface OfficialStatusProvider {
  id: string
  name: string
  type: string
  model: string
  group: string
  display_group: string
  endpoint: string
  latest: OfficialStatusLatest
  statistics: OfficialStatusStatistics
  timeline: OfficialStatusTimelinePoint[]
}

export interface OfficialStatusSummary {
  total: number
  operational: number
  degraded: number
  failed: number
  validation_failed: number
  maintenance: number
  avg_latency_ms: number
}

export interface OfficialStatusMetadata {
  generated_at: string
  poll_interval_ms: number
  poll_interval_label: string
  filters: {
    group: string | null
    model: string | null
  }
}

export interface OfficialStatusResponse {
  providers: OfficialStatusProvider[]
  summary: OfficialStatusSummary
  metadata: OfficialStatusMetadata
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function get88codeStatus(
  options: { baseUrl?: string; signal?: AbortSignal } = {},
): Promise<ApiResult<OfficialStatusResponse>> {
  const baseUrl = options.baseUrl ?? OFFICIAL_STATUS_API_URL

  try {
    const response = await fetch(baseUrl, { signal: options.signal })
    const json: unknown = await response.json()

    if (!isObject(json)) {
      return {
        success: false,
        data: { providers: [], summary: {} as OfficialStatusSummary, metadata: {} as OfficialStatusMetadata },
        message: '官方状态 API 响应格式错误',
        error: json,
      }
    }

    if ('error' in json && typeof json.error === 'string') {
      return {
        success: false,
        data: { providers: [], summary: {} as OfficialStatusSummary, metadata: {} as OfficialStatusMetadata },
        message: json.error,
        error: json,
      }
    }

    if (!('providers' in json) || !Array.isArray(json.providers)) {
      return {
        success: false,
        data: { providers: [], summary: {} as OfficialStatusSummary, metadata: {} as OfficialStatusMetadata },
        message: '官方状态 API 响应缺少 providers 字段',
        error: json,
      }
    }

    return { success: true, data: json as OfficialStatusResponse }
  } catch (error) {
    return {
      success: false,
      data: { providers: [], summary: {} as OfficialStatusSummary, metadata: {} as OfficialStatusMetadata },
      message: error instanceof Error ? error.message : '官方状态 API 请求失败',
      error,
    }
  }
}
