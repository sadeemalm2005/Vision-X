/**
 * Browser-local persistence for analysis history and saved sites.
 *
 * Deliberate prototype scope: there is no account system, so data lives only
 * in this browser (localStorage). It is not synced and is lost if site data is
 * cleared. Every access is wrapped because storage can be unavailable
 * (private mode, blocked cookies); the app keeps working in memory.
 */
import { useSyncExternalStore } from 'react'
import type { AnalysisResult } from './types'

const HISTORY_KEY = 'e2m.history.v1'
const SAVED_KEY = 'e2m.saved.v1'
const MAX_HISTORY = 25

export interface SavedSite {
  siteId: string
  siteName: string
  country: string
  analysisId: string | null
  context: string | null // e.g. "Mars · Gale Crater · Rover mobility"
  score: number | null
  savedAt: string
}

type Listener = () => void
const listeners = new Set<Listener>()
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string) {
  memory.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* quota exceeded or storage blocked: in-memory copy still works */
  }
  snapshots.delete(key)
  listeners.forEach((l) => l())
}

// Snapshot cache so useSyncExternalStore gets stable references.
const snapshots = new Map<string, { raw: string | null; value: unknown }>()
function parsed<T>(key: string, fallback: T): T {
  const raw = read(key)
  const hit = snapshots.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  let value: T = fallback
  if (raw) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = fallback
    }
  }
  snapshots.set(key, { raw, value })
  return value
}

function subscribe(l: Listener) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key === HISTORY_KEY || e.key === SAVED_KEY) {
      snapshots.delete(e.key)
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

const EMPTY_HISTORY: AnalysisResult[] = []
const EMPTY_SAVED: SavedSite[] = []

export const history = {
  all: () => parsed<AnalysisResult[]>(HISTORY_KEY, EMPTY_HISTORY),
  get: (id: string) => history.all().find((a) => a.id === id),
  latest: () => history.all()[0],
  add(a: AnalysisResult) {
    const next = [a, ...history.all().filter((x) => x.id !== a.id)].slice(0, MAX_HISTORY)
    write(HISTORY_KEY, JSON.stringify(next))
  },
  remove(id: string) {
    write(HISTORY_KEY, JSON.stringify(history.all().filter((a) => a.id !== id)))
  },
  clear() {
    write(HISTORY_KEY, '[]')
  },
}

export const saved = {
  all: () => parsed<SavedSite[]>(SAVED_KEY, EMPTY_SAVED),
  has: (siteId: string, analysisId: string | null) =>
    saved.all().some((s) => s.siteId === siteId && s.analysisId === analysisId),
  toggle(entry: Omit<SavedSite, 'savedAt'>) {
    const list = saved.all()
    const exists = list.some((s) => s.siteId === entry.siteId && s.analysisId === entry.analysisId)
    const next = exists
      ? list.filter((s) => !(s.siteId === entry.siteId && s.analysisId === entry.analysisId))
      : [{ ...entry, savedAt: new Date().toISOString() }, ...list]
    write(SAVED_KEY, JSON.stringify(next))
    return !exists
  },
  remove(siteId: string, analysisId: string | null) {
    write(SAVED_KEY, JSON.stringify(saved.all().filter((s) => !(s.siteId === siteId && s.analysisId === analysisId))))
  },
}

export function useHistory() {
  return useSyncExternalStore(subscribe, history.all, () => EMPTY_HISTORY)
}

export function useSaved() {
  return useSyncExternalStore(subscribe, saved.all, () => EMPTY_SAVED)
}
