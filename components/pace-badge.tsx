import { PaceStatus } from "@/lib/types";

export function PaceBadge({ status }: { status: PaceStatus }) {
  const label = status === "on_track" ? "On Track" : status === "at_risk" ? "At Risk" : "Behind";
  return <span className={`badge badge-${status}`}>{label}</span>;
}
