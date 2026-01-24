import { useState, useRef, useEffect } from "react"
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Check,
  Cog,
} from "lucide-react"
import type { Theme } from "./Settings"

interface SettingsDropdownProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onOpenSettings: () => void
}

export function SettingsDropdown({
  theme,
  onThemeChange,
  onOpenSettings,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showThemeOptions, setShowThemeOptions] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowThemeOptions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ]

  const handleThemeSelect = (newTheme: Theme) => {
    onThemeChange(newTheme)
    setShowThemeOptions(false)
    setIsOpen(false)
  }

  const handleOpenSettings = () => {
    setIsOpen(false)
    setShowThemeOptions(false)
    onOpenSettings()
  }

  const currentThemeOption = themeOptions.find((opt) => opt.value === theme)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setShowThemeOptions(false)
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-secondary shadow-lg">
          {/* Theme Option */}
          <div>
            <button
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              onClick={() => setShowThemeOptions(!showThemeOptions)}
            >
              <span className="flex items-center gap-3">
                {currentThemeOption?.icon}
                <span>Theme</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentThemeOption?.label}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    showThemeOptions ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Theme Options - Inline */}
            {showThemeOptions && (
              <div className="border-t border-border bg-muted/50">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleThemeSelect(option.value)}
                    className="flex w-full items-center justify-between px-3 py-2 pl-10 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-3">
                      {option.icon}
                      <span>{option.label}</span>
                    </span>
                    {theme === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-border" />

          {/* Settings Page Option */}
          <button
            onClick={handleOpenSettings}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Cog className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      )}
    </div>
  )
}
