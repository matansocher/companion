import { useState } from "react"
import { X, Plus } from "lucide-react"

type BlocklistEditorProps = {
  blocklist: string[]
  onChange: (blocklist: string[]) => void
}

export function BlocklistEditor({ blocklist, onChange }: BlocklistEditorProps) {
  const [input, setInput] = useState("")

  const handleAdd = () => {
    const domain = input.trim().toLowerCase()
    if (domain && !blocklist.includes(domain)) {
      onChange([...blocklist, domain])
      setInput("")
    }
  }

  const handleRemove = (domain: string) => {
    onChange(blocklist.filter((d) => d !== domain))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="example.com"
          className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {blocklist.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {blocklist.map((domain) => (
            <span
              key={domain}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-foreground"
            >
              {domain}
              <button
                onClick={() => handleRemove(domain)}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
