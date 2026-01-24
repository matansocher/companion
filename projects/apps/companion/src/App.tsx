import { useState, useEffect } from "react"
import { Chat } from "./components/Chat"
import { Settings } from "./components/Settings"
import { apiClient } from "./lib/api"
import { getPageContext } from "./lib/chrome"
import type { Message, SettingsState, Theme } from "@companion/shared"

type View = "chat" | "settings"

function getEffectiveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return theme
}

// Initial empty messages - ready for real API communication
const initialMessages: Message[] = []

const defaultSettings: SettingsState = {
  theme: "dark",
}

function App() {
  const [view, setView] = useState<View>("chat")
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)

  // Apply theme setting
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(settings.theme)
    document.body.setAttribute("data-theme", effectiveTheme)
  }, [settings.theme])

  // Listen for system theme changes when using "system" theme
  useEffect(() => {
    if (settings.theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme("system")
      document.body.setAttribute("data-theme", effectiveTheme)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [settings.theme])

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    console.log('!!!!!!!!!!!!!!!!!!!!!!')
    setIsLoading(true)
    try {
      // Get the current page context (URL, title, content)
      const context = await getPageContext()

      // Send message with page context to the API
      const response = await apiClient.sendMessage({ content, context })

      // Convert timestamp string back to Date if needed
      const assistantMessage: Message = {
        ...response.message,
        timestamp: response.message.timestamp
          ? new Date(response.message.timestamp)
          : new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't connect to the server. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setMessages([])
      setSettings(defaultSettings)
      setView("chat")
    }
  }

  const handleClearChatHistory = () => {
    if (confirm("Clear all chat messages?")) {
      setMessages([])
    }
  }

  if (view === "settings") {
    return (
      <Settings
        onBack={() => setView("chat")}
        onClearData={handleClearData}
        onClearChatHistory={handleClearChatHistory}
        messageCount={messages.length}
      />
    )
  }

  return (
    <Chat
      messages={messages}
      onSendMessage={handleSendMessage}
      onOpenSettings={() => setView("settings")}
      theme={settings.theme}
      onThemeChange={(theme) => setSettings((prev) => ({ ...prev, theme }))}
      isLoading={isLoading}
    />
  )
}

export default App
