import { useState } from "react"
import {
  ArrowLeft,
  Trash2,
  MessageSquare,
  Info,
  ExternalLink,
  Keyboard,
  Database,
  Shield,
  BarChart3,
  Download,
  Target,
  ChevronRight,
  Tag,
  Pin,
  Timer,
  X,
  Plus,
} from "lucide-react"
import { cn } from "../lib/utils"
import { BlocklistEditor } from "./BlocklistEditor"
import type { Theme, SettingsState, AnalyticsSettings, DomainCategory } from "@companion/shared"

export type { Theme, SettingsState }

const ALL_CATEGORIES: DomainCategory[] = [
  "Social Media", "Work", "News", "Entertainment", "Shopping", "Development", "Other",
]

const IDLE_PRESETS = [
  { label: "Off", ms: 0 },
  { label: "1 min", ms: 60000 },
  { label: "2 min", ms: 120000 },
  { label: "5 min", ms: 300000 },
  { label: "10 min", ms: 600000 },
]

type SettingsProps = {
  onBack: () => void
  onClearData: () => void
  onClearChatHistory: () => void
  messageCount: number
  analyticsSettings: AnalyticsSettings
  onSaveAnalyticsSettings: (settings: AnalyticsSettings) => void
  onClearAnalyticsData: () => void
  onExport: (format: "csv" | "json") => void
  onOpenFocusSettings: () => void
  focusBudgetCount: number
}

export function Settings({
  onBack,
  onClearData,
  onClearChatHistory,
  messageCount,
  analyticsSettings,
  onSaveAnalyticsSettings,
  onClearAnalyticsData,
  onExport,
  onOpenFocusSettings,
  focusBudgetCount,
}: SettingsProps) {
  const [newPinDomain, setNewPinDomain] = useState("")
  const [newCatDomain, setNewCatDomain] = useState("")
  const [newCatValue, setNewCatValue] = useState<DomainCategory>("Other")

  const handleAddPin = () => {
    const d = newPinDomain.trim().toLowerCase()
    if (d && !analyticsSettings.pinnedDomains.includes(d)) {
      onSaveAnalyticsSettings({
        ...analyticsSettings,
        pinnedDomains: [...analyticsSettings.pinnedDomains, d],
      })
      setNewPinDomain("")
    }
  }

  const handleRemovePin = (domain: string) => {
    onSaveAnalyticsSettings({
      ...analyticsSettings,
      pinnedDomains: analyticsSettings.pinnedDomains.filter((d) => d !== domain),
    })
  }

  const handleAddCategory = () => {
    const d = newCatDomain.trim().toLowerCase()
    if (d) {
      onSaveAnalyticsSettings({
        ...analyticsSettings,
        customCategories: { ...analyticsSettings.customCategories, [d]: newCatValue },
      })
      setNewCatDomain("")
    }
  }

  const handleRemoveCategory = (domain: string) => {
    const updated = { ...analyticsSettings.customCategories }
    delete updated[domain]
    onSaveAnalyticsSettings({ ...analyticsSettings, customCategories: updated })
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
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Chat Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Chat
          </h2>

          <div className="rounded-xl bg-secondary p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Chat History
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {messageCount} messages in current session
                </p>
              </div>
              <button
                onClick={onClearChatHistory}
                disabled={messageCount === 0}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  messageCount === 0
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* Analytics Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </h2>

          <div className="space-y-3">
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Tracking
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Track browsing time on visited pages
                  </p>
                </div>
                <button
                  onClick={() =>
                    onSaveAnalyticsSettings({
                      ...analyticsSettings,
                      trackingEnabled: !analyticsSettings.trackingEnabled,
                    })
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    analyticsSettings.trackingEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                      analyticsSettings.trackingEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Idle Detection */}
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Idle Detection</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Pause tracking when you're away from the keyboard
              </p>
              <div className="flex flex-wrap gap-2">
                {IDLE_PRESETS.map((preset) => (
                  <button
                    key={preset.ms}
                    onClick={() =>
                      onSaveAnalyticsSettings({
                        ...analyticsSettings,
                        idleTimeoutMs: preset.ms,
                      })
                    }
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      analyticsSettings.idleTimeoutMs === preset.ms
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-secondary p-4">
              <h3 className="mb-2 text-sm font-medium text-foreground">
                Blocked Domains
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Domains in this list will not be tracked
              </p>
              <BlocklistEditor
                blocklist={analyticsSettings.blocklist}
                onChange={(blocklist) =>
                  onSaveAnalyticsSettings({ ...analyticsSettings, blocklist })
                }
              />
            </div>

            <button
              onClick={onOpenFocusSettings}
              className="flex w-full items-center gap-3 rounded-xl bg-secondary p-4 transition-colors hover:bg-secondary/80"
            >
              <Target className="h-5 w-5 text-primary" />
              <div className="flex-1 text-left">
                <h3 className="text-sm font-medium text-foreground">Focus Mode</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {focusBudgetCount > 0
                    ? `${focusBudgetCount} budget${focusBudgetCount !== 1 ? "s" : ""} active`
                    : "Set daily time budgets for domains"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Pinned Domains Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Pin className="h-4 w-4" />
            Pinned Domains
          </h2>

          <div className="rounded-xl bg-secondary p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Pinned domains always appear at the top of the analytics list
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPinDomain}
                onChange={(e) => setNewPinDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPin() } }}
                placeholder="example.com"
                className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={handleAddPin}
                disabled={!newPinDomain.trim()}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Pin
              </button>
            </div>
            {analyticsSettings.pinnedDomains.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analyticsSettings.pinnedDomains.map((d) => (
                  <span
                    key={d}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-foreground"
                  >
                    <Pin className="h-3 w-3 -rotate-45" />
                    {d}
                    <button
                      onClick={() => handleRemovePin(d)}
                      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Custom Categories Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Tag className="h-4 w-4" />
            Custom Categories
          </h2>

          <div className="rounded-xl bg-secondary p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Override the default category for specific domains
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatDomain}
                onChange={(e) => setNewCatDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory() } }}
                placeholder="example.com"
                className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <select
                value={newCatValue}
                onChange={(e) => setNewCatValue(e.target.value as DomainCategory)}
                className="rounded-lg bg-muted px-2 py-2 text-xs text-foreground outline-none"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddCategory}
              disabled={!newCatDomain.trim()}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Set Category
            </button>

            {Object.keys(analyticsSettings.customCategories).length > 0 && (
              <div className="space-y-2 pt-1">
                {Object.entries(analyticsSettings.customCategories).map(([domain, cat]) => (
                  <div
                    key={domain}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2"
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      alt=""
                      className="h-4 w-4 rounded"
                    />
                    <span className="flex-1 text-xs text-foreground truncate">{domain}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {cat}
                    </span>
                    <button
                      onClick={() => handleRemoveCategory(domain)}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Export Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Download className="h-4 w-4" />
            Export & Data
          </h2>

          <div className="space-y-3">
            <div className="rounded-xl bg-secondary p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">
                Export Browsing Data
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => onExport("csv")}
                  className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => onExport("json")}
                  className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                >
                  Export JSON
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-secondary p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground">
                  Clear Analytics Data
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Delete all browsing analytics records
                </p>
              </div>
              <button
                onClick={onClearAnalyticsData}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Clear Analytics Data
              </button>
            </div>
          </div>
        </section>

        {/* Privacy & Data Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-4 w-4" />
            Privacy & Data
          </h2>

          <div className="space-y-3">
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Data Storage
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    All data is stored locally in your browser. Nothing is sent
                    to external servers except when communicating with AI
                    services.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-secondary p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground">
                  Clear All Data
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Delete all chat history and reset settings to defaults
                </p>
              </div>
              <button
                onClick={onClearData}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </button>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts Section */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </h2>

          <div className="rounded-xl bg-secondary p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Send message</span>
                <kbd className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">New line</span>
                <kbd className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Shift + Enter
                </kbd>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Info className="h-4 w-4" />
            About
          </h2>

          <div className="rounded-xl bg-secondary p-4">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Companion
              </h3>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>

            <p className="mb-4 text-center text-sm text-muted-foreground">
              Your AI-powered page assistant. Ask questions about any webpage
              and get instant, helpful answers.
            </p>

            <div className="flex flex-col gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/80"
              >
                <ExternalLink className="h-4 w-4" />
                View on GitHub
              </a>
              <a
                href="https://github.com/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/80"
              >
                <ExternalLink className="h-4 w-4" />
                Report an Issue
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-center text-xs text-muted-foreground">
          Made with care for better browsing
        </p>
      </div>
    </div>
  )
}
