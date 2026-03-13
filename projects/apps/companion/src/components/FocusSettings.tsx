import { useState } from "react"
import type { FocusBudget } from "@companion/shared"
import { formatDuration } from "../lib/analytics-storage"
import { ArrowLeft, Plus, X, Target, Clock } from "lucide-react"
import { cn } from "../lib/utils"

const PRESET_HOURS = [0.25, 0.5, 1, 2, 3, 4]

type FocusSettingsProps = {
  budgets: FocusBudget[]
  onSave: (budgets: FocusBudget[]) => void
  onBack: () => void
}

export function FocusSettings({ budgets, onSave, onBack }: FocusSettingsProps) {
  const [domain, setDomain] = useState("")
  const [hours, setHours] = useState(1)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAdd = () => {
    const d = domain.trim().toLowerCase()
    if (!d) return
    if (budgets.some((b) => b.domain === d)) return

    onSave([...budgets, { domain: d, dailyLimitMs: hours * 60 * 60 * 1000 }])
    setDomain("")
    setHours(1)
  }

  const handleRemove = (index: number) => {
    onSave(budgets.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const handleUpdateLimit = (index: number, newHours: number) => {
    const updated = budgets.map((b, i) =>
      i === index ? { ...b, dailyLimitMs: newHours * 60 * 60 * 1000 } : b
    )
    onSave(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

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
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">Focus Mode</h1>
          <p className="text-xs text-muted-foreground">Set daily time budgets</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Explanation */}
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-xs text-muted-foreground">
            Set a daily time budget for specific domains. A yellow warning appears at 80% usage and a red warning when the budget is exceeded.
          </p>
        </div>

        {/* Add new budget */}
        <div className="rounded-xl bg-secondary p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Add Budget</h3>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. reddit.com"
            className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Daily limit</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    hours === h
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {formatDuration(h * 60 * 60 * 1000)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!domain.trim() || budgets.some((b) => b.domain === domain.trim().toLowerCase())}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Budget
          </button>
        </div>

        {/* Existing budgets */}
        {budgets.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Budgets ({budgets.length})
            </h3>
            {budgets.map((budget, index) => (
              <div
                key={budget.domain}
                className="rounded-xl bg-secondary p-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${budget.domain}&sz=32`}
                    alt=""
                    className="h-5 w-5 rounded"
                  />
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {budget.domain}
                  </span>
                  <button
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Clock className="h-3 w-3" />
                    {formatDuration(budget.dailyLimitMs)}
                  </button>
                  <button
                    onClick={() => handleRemove(index)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {editingIndex === index && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    {PRESET_HOURS.map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          handleUpdateLimit(index, h)
                          setEditingIndex(null)
                        }}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          budget.dailyLimitMs === h * 60 * 60 * 1000
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {formatDuration(h * 60 * 60 * 1000)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {budgets.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <Target className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No budgets set yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a domain above to start tracking limits
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
