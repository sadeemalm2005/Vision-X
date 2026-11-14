import { describe, expect, it } from 'vitest'
import { DEFAULT_EXTRA_WEIGHT, previewWeights } from './weights'

const rover = { slope: 0.3, roughness: 0.3, elevation_relief: 0.15, rock_obstacles: 0.15, terrain_variability: 0.1 }
const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0)

describe('previewWeights', () => {
  it('keeps the full rover profile unchanged', () => {
    const w = previewWeights(Object.keys(rover), rover)
    Object.entries(rover).forEach(([k, v]) => expect(w[k]).toBeCloseTo(v))
  })

  it('renormalizes a subset to 100%', () => {
    const w = previewWeights(['slope', 'roughness'], rover)
    expect(w).toEqual({ slope: 0.5, roughness: 0.5 })
  })

  it('gives features outside the profile the default weight before normalizing', () => {
    const w = previewWeights(['slope', 'geology'], { slope: 0.3 })
    expect(w.geology).toBeCloseTo(DEFAULT_EXTRA_WEIGHT / 0.4)
    expect(sum(w)).toBeCloseTo(1)
  })

  it('applies and normalizes custom overrides', () => {
    const w = previewWeights(['slope', 'roughness'], rover, { slope: 75, roughness: 25 })
    expect(w).toEqual({ slope: 0.75, roughness: 0.25 })
  })

  it('returns zeros instead of NaN when every weight is zero', () => {
    const w = previewWeights(['slope'], rover, { slope: 0 })
    expect(w.slope).toBe(0)
  })
})
