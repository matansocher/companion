import { useState, useEffect, useCallback } from "react"
import type { TimeRange, PageVisit } from "@companion/shared"
import { getVisitsForDomain, formatDuration, categorizeDomain, getAnalyticsSettings } from "../lib/analytics-storage"
import { useActiveSession } from "../lib/use-active-session"
import { TimeRangeFilter } from "./TimeRangeFilter"
import { PageVisitItem } from "./PageVisitItem"
import { ArrowLeft } from "lucide-react"
import type { DomainCategory } from "@companion/shared"

type PageDetailsProps = {
  domain: string
  onBack: () => void
}

export function PageDetails({ domain, onBack }: PageDetailsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("today")
  const [visits, setVisits] = useState<PageVisit[]>([])
  const [customCategories, setCustomCategories] = useState<Record<string, DomainCategory>>({})
  const { session, liveElapsed } = useActiveSession()

  const isActive = session?.domain === domain

  const loadData = useCallback(async () => {
    const [data, settings] = await Promise.all([
      getVisitsForDomain(domain, timeRange),
      getAnalyticsSettings(),
    ])
    setVisits(data)
    setCustomCategories(settings.customCategories)
  }, [domain, timeRange])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [loadData])

  const storedDuration = visits.reduce((sum, v) => sum + v.duration, 0)
  const totalDuration = storedDuration + (isActive ? liveElapsed : 0)
  const category = categorizeDomain(domain, customCategories)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt=""
          className="h-6 w-6 rounded"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground truncate">{domain}</h1>
            {isActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {category} · <span className={isActive ? "tabular-nums text-green-500 font-medium" : ""}>{formatDuration(totalDuration)}</span> · {visits.length + (isActive ? 1 : 0)} visit{visits.length + (isActive ? 1 : 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

        {/* Live session card */}
        {isActive && session && (
          <div className="rounded-xl bg-green-500/8 ring-1 ring-green-500/25 px-3 py-2.5">
            <div className="flex items-start gap-3">
              <span className="relative mt-1 flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.title || session.url}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{session.url}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium tabular-nums text-green-500">{formatDuration(liveElapsed)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">now</p>
              </div>
            </div>
          </div>
        )}

        {visits.length === 0 && !isActive ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No visits in this time range
          </p>
        ) : (
          <div className="space-y-0.5">
            {visits.map((visit) => (
              <PageVisitItem key={visit.id} visit={visit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
