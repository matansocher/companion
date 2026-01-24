import {
  ArrowLeft,
  Trash2,
  MessageSquare,
  Info,
  ExternalLink,
  Keyboard,
  Database,
  Shield,
} from "lucide-react"
import { cn } from "../lib/utils"
import type { Theme, SettingsState } from "@companion/shared"

export type { Theme, SettingsState }

interface SettingsProps {
  onBack: () => void
  onClearData: () => void
  onClearChatHistory: () => void
  messageCount: number
}

export function Settings({
  onBack,
  onClearData,
  onClearChatHistory,
  messageCount,
}: SettingsProps) {
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
