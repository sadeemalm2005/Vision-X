// Mirrors the FastAPI response shapes (backend/app/api.py, services/*).

export type Body = 'moon' | 'mars'
export type DataStatus = 'demo' | 'real'
export type FeatureStatus = 'scored' | 'missing_target' | 'missing_candidate' | 'insufficient_resolution'
export type Confidence = 'high' | 'medium' | 'low'

export interface Measurement {
  value: number | string
  resolution_m: number | null
  dataset_id: string
  provenance: string
}

export interface TargetRegion {
  id: string
  body: Body
  name: string
  region_type: string
  lat: number
  lon: number
  description: string
  data_status: DataStatus
  measurements: Record<string, Measurement>
}

export interface CandidateSite {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  relevant_bodies: Body[]
  description: string
  terrain: string[]
  potential_comparison: string
  applications: string[]
  caution: string
  data_status: DataStatus
  data_quality: string
  measurements: Record<string, Measurement>
}

export interface FeatureSpec {
  id: string
  name: string
  short_name: string
  unit: string | null
  kind: 'numeric' | 'log_ratio' | 'categorical'
  description: string
  measured_as: string
  relevance: string
  tolerance: number | null
  max_effective_resolution_m: number | null
}

export interface MissionProfile {
  id: string
  name: string
  summary: string
  focus: string[]
  weights: Record<string, number>
  caveat: string
  required: string[]
}

export interface Dataset {
  id: string
  name: string
  body: Body | 'earth'
  instrument: string
  product: string
  nominal_resolution_m: number | null
  source: string
  url: string
  status: 'planned' | 'imagery_only' | 'connected'
  notes: string
}

export interface FeatureAvailability {
  feature_id: string
  available: boolean
  target_measured: boolean
  target_dataset: string | null
  target_resolution_m: number | null
  candidates_with_data: number
  candidates_comparable: number
  candidates_total: number
  reason: string | null
}

export interface FeatureResult {
  feature_id: string
  weight: number
  status: FeatureStatus
  similarity: number | null
  contribution: number | null
  target_value: number | string | null
  candidate_value: number | string | null
  effective_resolution_m: number | null
  target_dataset: string | null
  candidate_dataset: string | null
  note: string | null
}

export interface ExplanationPoint {
  feature_id: string
  text: string
  similarity: number | null
}

export interface Explanation {
  headline: string
  summary: string
  strengths: ExplanationPoint[]
  differences: ExplanationPoint[]
  unavailable: ExplanationPoint[]
  top_contributors: string[]
}

export interface SiteResult {
  rank: number
  site: CandidateSite
  score: number | null
  withheld: boolean
  withheld_reason: string | null
  coverage: number
  lower_bound: number
  upper_bound: number
  confidence: Confidence
  features: FeatureResult[]
  explanation: Explanation
}

export interface EnvironmentalDifference {
  factor: string
  detail: string
}

export interface AnalysisResult {
  id: string
  created_at: string
  data_mode: DataStatus
  provider: string
  body: Body
  target: TargetRegion
  mission: { id: string; name: string; caveat: string; required: string[] }
  weights: { feature_id: string; weight: number; default_weight: number | null }[]
  results: SiteResult[]
  datasets_used: string[]
  environmental_differences: EnvironmentalDifference[]
  scoring: { formula: string; min_coverage: number; rule: string }
  disclaimer: string
}

export interface AnalyzeRequest {
  body: Body
  target_id: string
  mission_id: string
  features: string[]
  weights?: Record<string, number>
}

export interface Histogram {
  unit: string
  bin_edges: number[]
  counts: number[]
}

export interface TerrainSummary {
  entity_id: string
  provenance: string
  elevation_histogram: Histogram
  slope_histogram: Histogram
  profile_distance_m: number[]
  profile_elevation_m: number[]
}

export interface Meta {
  provider: string
  data_mode: DataStatus
  disclaimer: string
  min_coverage: number
  counts: { candidates: number; targets: number; datasets: number }
}

export interface BodiesInfo {
  bodies: Record<string, Record<string, string | number>>
  differences: Record<Body, EnvironmentalDifference[]>
}
