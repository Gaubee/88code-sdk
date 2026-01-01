import type { RelayPulseStatusEntry } from "@gaubee/88code-sdk";

export function formatRelayPulseTimestampSeconds(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1000);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export function getRelayPulseStatusLabel(status: number): {
  text: string;
  className: string;
} {
  if (status === 1) {
    return {
      text: "可用",
      className: "bg-green-600/10 text-green-600 border border-green-600/20",
    };
  }
  if (status === 2) {
    return {
      text: "降级",
      className: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    };
  }
  if (status === 0) {
    return {
      text: "不可用",
      className: "bg-destructive/10 text-destructive border border-destructive/20",
    };
  }
  return {
    text: "未知",
    className: "bg-muted text-muted-foreground border border-border",
  };
}

export function computeRelayPulseAvailabilityPercent(entry: RelayPulseStatusEntry): number {
  if (entry.timeline.length === 0) return 0;
  const sum = entry.timeline.reduce((acc, point) => acc + (point.availability ?? 0), 0);
  return sum / entry.timeline.length;
}

