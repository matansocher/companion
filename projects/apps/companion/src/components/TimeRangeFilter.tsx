import type { TimeRange } from "@companion/shared"
import { ChevronDown } from "lucide-react"

const options: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7 Days" },
  { value: "30days", label: "30 Days" },
  { value: "all", label: "All Time" },
]

type TimeRangeFilterProps = {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TimeRange)}
        className="appearance-none rounded-lg bg-secondary pl-3 pr-8 py-1.5 text-xs font-medium text-foreground outline-none cursor-pointer border border-border hover:bg-muted transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
