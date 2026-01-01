import { createFileRoute } from "@tanstack/react-router";
import { RelayPulseStatusPage } from "@/components/relaypulse-status-page";

export const Route = createFileRoute("/status")({ component: StatusPage });

function StatusPage() {
  return <RelayPulseStatusPage />;
}

