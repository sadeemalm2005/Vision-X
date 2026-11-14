import { useMemo } from 'react'
import { api } from './api'
import type { FeatureSpec, MissionProfile } from './types'
import { useApi } from './useApi'

/** Feature catalog keyed by id (cached after first load). */
export function useFeatureCatalog() {
  const q = useApi('features', api.features)
  const byId = useMemo(() => Object.fromEntries((q.data ?? []).map((f) => [f.id, f])) as Record<string, FeatureSpec>, [q.data])
  return { ...q, byId }
}

export function useMissions() {
  const q = useApi('missions', api.missions)
  const byId = useMemo(() => Object.fromEntries((q.data ?? []).map((m) => [m.id, m])) as Record<string, MissionProfile>, [q.data])
  return { ...q, byId }
}

export function featureName(byId: Record<string, FeatureSpec>, id: string, short = false) {
  const f = byId[id]
  if (!f) return id
  return short ? f.short_name : f.name
}
