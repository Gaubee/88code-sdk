import { createFileRoute } from '@tanstack/react-router'
import { SettingsPanel } from '@/components/settings-panel'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  return <SettingsPanel />
}
