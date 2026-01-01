/**
 * 88Code SDK 核心客户端
 */

import type { ApiResult, Code88Config, Code88Response } from './types.ts'
import { DEFAULT_BASE_URL } from './config.ts'

export class Code88Client {
  private baseUrl: string
  private authToken: string
  private debug: boolean

  constructor(config: Code88Config) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    this.authToken = this.cleanToken(config.authToken)
    this.debug = config.debug ?? false
  }

  /** 清理 token（移除引号和空白） */
  private cleanToken(token: string): string {
    if (!token) return ''
    return token.replace(/^["']|["']$/g, '').trim()
  }

  /** 调试日志 */
  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[88code-sdk] ${message}`, ...args)
    }
  }

  /** 创建认证请求头 */
  private createHeaders(): RequestInit['headers'] {
    return {
      'Content-Type': 'application/json',
      authorization: `Bearer ${this.authToken}`,
    }
  }

  /** 构建完整 URL */
  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`
  }

  /**
   * 发起 GET 请求
   */
  async get<T>(endpoint: string): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  /**
   * 发起 POST 请求
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResult<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * 通用请求方法
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResult<T>> {
    const url = this.buildUrl(endpoint)

    try {
      this.log(`请求: ${options.method || 'GET'} ${url}`)

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.createHeaders(),
          ...options.headers,
        },
        // cache: "no-cache",
      })

      const responseText = await response.text()

      let data: Code88Response<T>
      try {
        data = JSON.parse(responseText)
      } catch {
        this.log('响应解析失败:', responseText)
        return {
          success: false,
          data: null as T,
          message: '响应数据格式错误',
        }
      }

      if (!response.ok || !data.ok) {
        this.log(`请求失败 [${response.status}]:`, data.msg)
        return {
          success: false,
          data: null as T,
          message: data.msg || '请求失败',
          error: data,
        }
      }

      this.log('请求成功')
      return {
        success: true,
        data: data.data,
      }
    } catch (error) {
      this.log('请求异常:', error)
      return {
        success: false,
        data: null as T,
        message: error instanceof Error ? error.message : '未知错误',
        error,
      }
    }
  }

  /** 更新 authToken */
  setAuthToken(token: string): void {
    this.authToken = this.cleanToken(token)
  }

  /** 获取当前配置的 baseUrl */
  getBaseUrl(): string {
    return this.baseUrl
  }
}
