import { useState, useCallback } from 'react'

const STORAGE_KEY = 'mangafire_search_history'
const MAX_HISTORY = 10

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeHistory(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(readHistory)

  const addEntry = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed)
      const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY)
      writeHistory(updated)
      return updated
    })
  }, [])

  const removeEntry = useCallback((query: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item !== query)
      writeHistory(updated)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    writeHistory([])
    setHistory([])
  }, [])

  return { history, addEntry, removeEntry, clearHistory }
}
