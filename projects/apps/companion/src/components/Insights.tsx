import { useState, useEffect, useCallback, useRef } from "react"
import type { TimeRange, DomainCategory } from "@companion/shared"
import {
  getCategoryBreakdown,
  getHeatmapData,
  getTabCounts,
  getAnalyticsSettings,
  formatDuration,
  type CategoryBreakdown,
  type HeatmapData,
  type TabCountEntry,
} from "../lib/analytics-storage"
import { TimeRangeFilter } from "./TimeRangeFilter"
import { TrendChart } from "./TrendChart"

type InsightsProps = {
  dailyData?: { date: string; total: number }[]
}

const CATEGORY_COLORS: Record<DomainCategory, string> = {
  "Social Media": "#ec4899",
  "Work": "#3b82f6",
  "News": "#f59e0b",
  "Entertainment": "#a855f7",
  "Shopping": "#22c55e",
  "Development": "#06b6d4",
  "Other": "#6b7280",
}

export function Insights({ dailyData = [] }: InsightsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7days")
  const [categories, setCategories] = useState<CategoryBreakdown[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapData>([])
  const [tabCounts, setTabCounts] = useState<TabCountEntry[]>([])

  const loadData = useCallback(async () => {
    const settings = await getAnalyticsSettings()
    const [cats, heat, tabs] = await Promise.all([
      getCategoryBreakdown(timeRange, settings.customCategories),
      getHeatmapData(timeRange),
      getTabCounts(timeRange),
    ])
    setCategories(cats)
    setHeatmap(heat)
    setTabCounts(tabs)
  }, [timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

      {dailyData.length > 0 && <TrendChart data={dailyData} />}

      {/* Category Breakdown & Open Tabs — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <DonutChart data={categories} />
        <TabCountChart data={tabCounts} />
      </div>

      {/* Heatmap */}
      <HeatmapChart data={heatmap} />
    </div>
  )
}

// ─── Donut Chart ────────────────────────────────────────────

function DonutChart({ data }: { data: CategoryBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-3 text-center">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </h3>
        <p className="py-4 text-[11px] text-muted-foreground">No data yet</p>
      </div>
    )
  }

  const size = 100
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = data.map((d) => {
    const length = d.percentage * circumference
    const dashoffset = -offset
    offset += length
    return { ...d, length, dashoffset }
  })

  const totalDuration = data.reduce((s, d) => s + d.totalDuration, 0)

  return (
    <div className="rounded-xl bg-secondary p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Categories
      </h3>

      <div className="flex flex-col items-center gap-2">
        {/* SVG donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={CATEGORY_COLORS[seg.category]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                strokeDashoffset={seg.dashoffset}
                strokeLinecap="round"
                style={{ opacity: 0.85 }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-foreground">{formatDuration(totalDuration)}</span>
            <span className="text-[8px] text-muted-foreground">total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-1">
          {segments.map((seg) => (
            <div key={seg.category} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[seg.category] }}
              />
              <span className="flex-1 text-[10px] text-foreground truncate">{seg.category}</span>
              <span className="text-[9px] tabular-nums text-muted-foreground">
                {Math.round(seg.percentage * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Heatmap ────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOUR_LABELS = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""]

function HeatmapChart({ data }: { data: HeatmapData }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-4 text-center">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity Heatmap
        </h3>
        <p className="py-4 text-sm text-muted-foreground">No data yet</p>
      </div>
    )
  }

  // Find max value for scaling
  let maxVal = 0
  for (const row of data) {
    for (const val of row) {
      if (val > maxVal) maxVal = val
    }
  }

  const getOpacity = (val: number) => {
    if (maxVal === 0 || val === 0) return 0
    return 0.15 + (val / maxVal) * 0.85
  }

  return (
    <div className="rounded-xl bg-secondary p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Activity Heatmap
      </h3>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 320 }}>
          {/* Hour labels */}
          <div className="flex ml-8 mb-1">
            {HOUR_LABELS.map((h, i) => (
              <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
                {h}
              </div>
            ))}
          </div>

          {/* Grid */}
          {DAY_LABELS.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-0.5">
              <span className="w-7 text-[9px] text-muted-foreground text-right shrink-0">{day}</span>
              <div className="flex flex-1 gap-px">
                {Array.from({ length: 24 }, (_, hour) => {
                  const val = data[dayIdx]?.[hour] || 0
                  return (
                    <div
                      key={hour}
                      className="flex-1 rounded-sm"
                      style={{
                        height: 14,
                        backgroundColor: `rgb(59, 130, 246)`,
                        opacity: getOpacity(val),
                        minWidth: 2,
                      }}
                      title={`${day} ${hour}:00 — ${formatDuration(val)}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* Intensity legend */}
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[8px] text-muted-foreground">Less</span>
            {[0.1, 0.3, 0.5, 0.7, 1].map((o, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ width: 10, height: 10, backgroundColor: "rgb(59, 130, 246)", opacity: o }}
              />
            ))}
            <span className="text-[8px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab Count Line Chart ───────────────────────────────────

function TabCountChart({ data }: { data: TabCountEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)

  if (data.length < 2) {
    return (
      <div className="rounded-xl bg-secondary p-3 text-center">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Open Tabs
        </h3>
        <p className="py-4 text-[11px] text-muted-foreground">
          {data.length === 0 ? "No data yet" : "Need more data"}
        </p>
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const chartHeight = 80
  const chartWidth = 200

  // Downsample to max ~80 points for performance
  const sampled = data.length > 80
    ? data.filter((_, i) => i % Math.ceil(data.length / 80) === 0 || i === data.length - 1)
    : data

  const pointCoords = sampled.map((d, i) => ({
    x: (i / (sampled.length - 1)) * chartWidth,
    y: chartHeight - (d.count / maxCount) * chartHeight,
  }))

  const polyline = pointCoords.map((p) => `${p.x},${p.y}`).join(" ")
  const areaPoints = `0,${chartHeight} ${polyline} ${chartWidth},${chartHeight}`

  // Compute stats
  const avg = Math.round(data.reduce((s, d) => s + d.count, 0) / data.length)
  const current = data[data.length - 1]?.count ?? 0

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const padding = 4
    const scaleX = (chartWidth + padding * 2) / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX - padding
    // Find closest point
    let closest = 0
    let minDist = Infinity
    for (let i = 0; i < pointCoords.length; i++) {
      const dist = Math.abs(pointCoords[i].x - mouseX)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    }
    setHover({ idx: closest, x: pointCoords[closest].x, y: pointCoords[closest].y })
  }

  const hoveredPoint = hover ? sampled[hover.idx] : null
  const formatTime = (ts: number) => new Date(ts).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })

  return (
    <div className="rounded-xl bg-secondary p-3" ref={containerRef}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Open Tabs
      </h3>

      {/* Compact stats */}
      <div className="flex gap-2 mb-2 text-center">
        <div className="flex-1 rounded-md bg-muted px-1 py-1">
          <p className="text-xs font-bold text-foreground">{current}</p>
          <p className="text-[8px] text-muted-foreground">Now</p>
        </div>
        <div className="flex-1 rounded-md bg-muted px-1 py-1">
          <p className="text-xs font-bold text-foreground">{avg}</p>
          <p className="text-[8px] text-muted-foreground">Avg</p>
        </div>
        <div className="flex-1 rounded-md bg-muted px-1 py-1">
          <p className="text-xs font-bold text-foreground">{maxCount}</p>
          <p className="text-[8px] text-muted-foreground">Peak</p>
        </div>
      </div>

      {/* SVG line chart with hover */}
      <div className="relative overflow-hidden">
        <svg
          viewBox={`-4 -4 ${chartWidth + 8} ${chartHeight + 8}`}
          className="w-full"
          style={{ height: chartHeight + 8 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid lines */}
          {[0, 0.5, 1].map((frac) => (
            <line
              key={frac}
              x1={0}
              y1={chartHeight * (1 - frac)}
              x2={chartWidth}
              y2={chartHeight * (1 - frac)}
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.5}
              strokeDasharray={frac === 0 ? undefined : "2,3"}
            />
          ))}

          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#tabGradient)" />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#a855f7"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Hover indicator */}
          {hover && (
            <>
              <line
                x1={hover.x}
                y1={0}
                x2={hover.x}
                y2={chartHeight}
                stroke="#a855f7"
                strokeWidth={0.75}
                strokeDasharray="3,2"
                opacity={0.6}
              />
              <circle cx={hover.x} cy={hover.y} r={3} fill="#a855f7" stroke="#0c1222" strokeWidth={1.5} />
            </>
          )}

          <defs>
            <linearGradient id="tabGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hover tooltip */}
        {hover && hoveredPoint && (
          <div
            className="pointer-events-none absolute rounded-md bg-background/95 border border-border px-2 py-1 shadow-lg"
            style={{
              left: `${(hover.x / chartWidth) * 100}%`,
              top: 0,
              transform: hover.x > chartWidth * 0.7 ? "translateX(-100%)" : "translateX(0)",
            }}
          >
            <p className="text-[10px] font-bold text-foreground">{hoveredPoint.count} tabs</p>
            <p className="text-[9px] text-muted-foreground">{formatTime(hoveredPoint.timestamp)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
