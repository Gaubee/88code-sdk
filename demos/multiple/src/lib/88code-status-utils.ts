import type { OfficialStatusType, OfficialStatusProvider } from '@gaubee/88code-sdk'

export function getOfficialStatusLabel(status: OfficialStatusType): {
  text: string
  className: string
} {
  switch (status) {
    case 'operational':
      return {
        text: '正常',
        className: 'bg-green-600/10 text-green-600 border border-green-600/20',
      }
    case 'degraded':
      return {
        text: '降级',
        className: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
      }
    case 'error':
      return {
        text: '故障',
        className:
          'bg-destructive/10 text-destructive border border-destructive/20',
      }
    default:
      return {
        text: '未知',
        className: 'bg-muted text-muted-foreground border border-border',
      }
  }
}

export function formatCheckedAt(isoString: string): string {
  const date = new Date(isoString)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

export function groupProvidersByDisplayGroup(
  providers: OfficialStatusProvider[],
): Map<string, OfficialStatusProvider[]> {
  const groups = new Map<string, OfficialStatusProvider[]>()
  for (const provider of providers) {
    const group = provider.display_group
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)!.push(provider)
  }
  return groups
}
