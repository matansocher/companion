import { formatDuration } from "../lib/analytics-storage"

type TrendChartProps = {
  data: { date: string; total: number }[]
}

export function TrendChart({ data }: TrendChartProps) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  return (
    <div className="rounded-xl bg-secondary p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Daily Trend
      </h3>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d, i) => {
          const heightPercent = (d.total / maxTotal) * 100
          return (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative w-full flex justify-center" style={{ height: 90 }}>
                <div
                  className="w-full max-w-[20px] rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(heightPercent, 2)}%`, marginTop: "auto" }}
                  title={`${d.date}: ${formatDuration(d.total)}`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {d.date.split(",")[0].split(" ")[0]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
