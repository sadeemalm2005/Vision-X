import type { Body, Confidence, FeatureSpec, FeatureStatus } from './types'

export const BODY_LABEL: Record<Body, string> = { moon: 'Moon', mars: 'Mars' }
export const BODY_COLOR: Record<Body | 'earth', string> = { moon: '#C9D2DF', mars: '#D98655', earth: '#4C9FD8' }

const GEOLOGY: Record<string, string> = {
  mare_basalt: 'Mare basalt',
  basaltic_lava: 'Basaltic lava',
  basaltic_regolith: 'Basaltic regolith',
  impact_breccia: 'Impact breccia',
  impact_ejecta: 'Impact ejecta',
  sedimentary_lacustrine: 'Lake sediments',
  evaporite_sedimentary: 'Evaporite / sedimentary',
  highland_anorthosite: 'Highland anorthosite',
}

export function formatValue(value: number | string | null | undefined, spec?: Pick<FeatureSpec, 'unit' | 'kind'>): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return GEOLOGY[value] ?? value
  const abs = Math.abs(value)
  const txt = abs < 1 ? value.toFixed(2) : abs < 100 ? value.toFixed(1) : value.toFixed(0)
  const unit = spec?.unit
  if (!unit) return txt
  return unit === '°' ? `${txt}°` : `${txt} ${unit}`
}

export function formatResolution(m: number | null | undefined): string {
  if (m === null || m === undefined) return 'n/a'
  if (m < 1) return `${(m * 100).toFixed(0)} cm`
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${m} m`
}

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  scored: 'Compared',
  missing_target: 'No target data',
  missing_candidate: 'No site data',
  insufficient_resolution: 'Resolution too coarse',
}

// Confidence reflects data coverage AND scale (regional comparisons cap at medium).
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

/** Similarity 0..1 -> qualitative tone used across charts and badges. */
export function simTone(s: number | null | undefined): 'good' | 'mid' | 'bad' | 'none' {
  if (s === null || s === undefined) return 'none'
  if (s >= 0.75) return 'good'
  if (s >= 0.5) return 'mid'
  return 'bad'
}

export const TONE_COLOR = { good: '#6FD4A8', mid: '#E6C26E', bad: '#E5807A', none: '#6F7F93' } as const

export function scoreColor(score: number | null): string {
  if (score === null) return TONE_COLOR.none
  return score >= 75 ? TONE_COLOR.good : score >= 50 ? TONE_COLOR.mid : TONE_COLOR.bad
}
