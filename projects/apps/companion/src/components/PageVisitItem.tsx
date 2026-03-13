import type { PageVisit } from "@companion/shared"
import { formatDuration } from "../lib/analytics-storage"

type PageVisitItemProps = {
  visit: PageVisit
}

export function PageVisitItem({ visit }: PageVisitItemProps) {
  const time = new Date(visit.startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  const date = new Date(visit.startTime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {visit.title || visit.url}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{visit.url}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-foreground">{formatDuration(visit.duration)}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {date} {time}
        </p>
      </div>
    </div>
  )
}
