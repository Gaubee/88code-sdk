'use client'

import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface Props {
  children: ReactNode
  title?: string
  fallbackHeight?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class CardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className={this.props.fallbackHeight}>
          {this.props.title && (
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center gap-2 text-base">
                <AlertCircle className="size-4" />
                {this.props.title}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
            <AlertCircle className="text-destructive size-8" />
            <p className="text-muted-foreground text-center text-sm">
              {this.state.error?.message || '加载失败'}
            </p>
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              <RefreshCw className="mr-1 size-3" />
              重试
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Query Error Fallback for use with TanStack Query
interface QueryErrorFallbackProps {
  title?: string
  error: Error | null
  onRetry?: () => void
  className?: string
}

export function QueryErrorFallback({
  title,
  error,
  onRetry,
  className,
}: QueryErrorFallbackProps) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive flex items-center gap-2 text-base">
            <AlertCircle className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
        <AlertCircle className="text-destructive size-8" />
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          {error?.message || '加载失败'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1 size-3" />
            重试
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Loading Card for consistent loading states
interface LoadingCardProps {
  title?: string
  className?: string
}

export function LoadingCard({ title, className }: LoadingCardProps) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex items-center justify-center py-8">
        <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
      </CardContent>
    </Card>
  )
}
