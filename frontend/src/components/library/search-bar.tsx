import { useRef } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    onChange("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && value) {
      e.preventDefault()
      handleClear()
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-zinc-500 pointer-events-none" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Buscar por título, autor, materia..."}
        aria-label={placeholder ?? "Buscar en biblioteca"}
        className="pl-12 pr-12 h-14 text-base md:text-lg rounded-xl border-2 border-gray-200 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 focus-visible:border-brand-500 focus-visible:ring-brand-500/20 shadow-sm transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
