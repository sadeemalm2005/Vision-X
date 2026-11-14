/**
 * Client-side preview of the backend weight rule (engine/similarity.py,
 * resolve_weights). The backend remains the source of truth; this only lets
 * the UI show normalized weights before the analysis is run.
 */
export const DEFAULT_EXTRA_WEIGHT = 0.1

export function previewWeights(
  selected: string[],
  missionWeights: Record<string, number>,
  overrides?: Record<string, number> | null,
): Record<string, number> {
  const raw: Record<string, number> = {}
  for (const id of selected) {
    const o = overrides?.[id]
    raw[id] = o !== undefined ? Math.max(0, o) : (missionWeights[id] ?? DEFAULT_EXTRA_WEIGHT)
  }
  const total = Object.values(raw).reduce((a, b) => a + b, 0)
  if (total <= 0) return Object.fromEntries(selected.map((id) => [id, 0]))
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / total]))
}
