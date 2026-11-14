import type {
  AnalysisResult,
  AnalyzeRequest,
  BodiesInfo,
  Body,
  Dataset,
  FeatureAvailability,
  FeatureSpec,
  MapLayers,
  Meta,
  MissionProfile,
  Site,
  TargetRegion,
  TerrainSummary,
} from './types'

// Same-origin by default (Vite proxies /api in dev). Set VITE_API_BASE_URL for
// a separately hosted API. No secrets ever live in frontend config.
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Cannot reach the Earth2Moon analysis service. Is the backend running on port 8000?', 0)
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status)
  }
  return res.json() as Promise<T>
}

export const api = {
  meta: () => request<Meta>('/meta'),
  bodies: () => request<BodiesInfo>('/bodies'),
  features: () => request<FeatureSpec[]>('/features'),
  missions: () => request<MissionProfile[]>('/missions'),
  datasets: () => request<Dataset[]>('/datasets'),
  targets: (body?: Body) => request<TargetRegion[]>(`/targets${body ? `?body=${body}` : ''}`),
  targetFeatures: (id: string) => request<FeatureAvailability[]>(`/targets/${encodeURIComponent(id)}/features`),
  sites: () => request<Site[]>('/sites'),
  mapLayers: () => request<MapLayers>('/map-layers'),
  terrain: (id: string) => request<TerrainSummary>(`/terrain/${encodeURIComponent(id)}`),
  analyze: (req: AnalyzeRequest) => request<AnalysisResult>('/analyze', { method: 'POST', body: JSON.stringify(req) }),
}
