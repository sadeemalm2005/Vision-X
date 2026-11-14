// Mirrors the FastAPI response shapes (backend/app/api.py, services/*).

export type Body = 'moon' | 'mars'
export type DataStatus = 'demo' | 'real' | 'no_data'
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
  scale_profile: string
  window_m: number
  image: { src: string; window_frac: number; source: string }
  measurements: Record<string, Measurement>
}

/** Catalogue entry for a research location (no measurements of its own). */
export interface Site {
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
  tiles: string[]
  suggested_tile: string | null
}

/** A scored Earth analysis window, with its parent site's context. */
export interface CandidateSite {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  bounds: [[number, number], [number, number]]
  image_box: [number, number, number, number]
  site_id: string
  site_name: string
  tile_id: string
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
  recommended_resolution_m: number | null
  requirement: string | null
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
  scale_note: string | null
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
  scale_limited: boolean
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
  scale_limited: boolean
  features: FeatureResult[]
  explanation: Explanation
  ml?: { cluster: number | null; cluster_label: string | null; same_cluster_as_target: boolean; knn_rank: number | null; knn_distance: number | null }
}

export interface TerrainCluster {
  id: number
  label: string
  size: number
  earth_windows: number
  centroid: Record<string, number>
}

export interface MLCrossCheck {
  available: boolean
  reason?: string
  features_used?: string[]
  clustering?: {
    method: string
    k: number
    silhouette: number
    silhouette_by_k: Record<string, number>
    n_samples: number
    features: string[]
    clusters: TerrainCluster[]
    target_cluster: number | null
    target_cluster_label: string | null
    earth_windows_in_target_cluster: number
  }
  knn?: {
    method: string
    top: { id: string; name: string; lat: number; lon: number; distance: number; knn_rank: number; score_rank: number; cluster: number | null }[]
  }
  agreement?: { top_n: number; top_overlap: number; spearman: number | null }
}

export interface ScaleProfile {
  id: string
  name: string
  grid_m: number
  window_m: number
  stride_m: number
  description: string
}

export interface PatchScore {
  id: string
  rank: number
  lat: number
  lon: number
  bounds: [[number, number], [number, number]]
  score: number | null
  lower_bound: number
  cluster?: number | null
  knn_rank?: number | null
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
  search: { scale_profile: ScaleProfile; patches_total: number; patches_withheld: number; top_n: number; all: PatchScore[] }
  ml?: MLCrossCheck
  /** AI-written summaries per Earth window, saved locally after generation. */
  ai_summaries?: Record<string, AISummary>
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
  top_n?: number
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
  counts: { candidates: number; sites_with_data: number; targets: number; datasets: number; patches: Record<string, number> }
  profiles: ScaleProfile[]
  generated_at?: string
  pipeline_version?: string
}

export interface EarthTileLayer {
  id: string
  site_id: string
  bounds: [[number, number], [number, number]]
  image: string
  image_px: [number, number]
  native_resolution_m: number
}

export interface MapLayers {
  moon_overview: { src: string; px: number; extent_m: number; scale_m: number }
  earth_tiles: EarthTileLayer[]
  generated_at: string
  pipeline_version: string
}

export interface BodiesInfo {
  bodies: Record<string, Record<string, string | number>>
  differences: Record<Body, EnvironmentalDifference[]>
}

export interface AISummary {
  summary: string
  provider: string
  model: string
  verified: boolean
  generated_at: string
  cached: boolean
}

export interface AIStatus {
  enabled: boolean
  provider: string | null
  model: string | null
  reason: string | null
}
