import { describe, expect, it } from 'vitest'
import { polarRadius, polarToImage, polarXY } from './polar'

const img = { px: 948, extent_m: 7584 * 40 }

describe('south polar projection', () => {
  it('puts the pole at the image centre', () => {
    const [y, x] = polarToImage(-90, 0, img)
    expect(x).toBeCloseTo(474)
    expect(y).toBeCloseTo(474)
  })

  it('matches the backend convention: lon 0 points up the image (+y), lon 90 to the right (+x)', () => {
    const up = polarXY(-89, 0)
    const right = polarXY(-89, 90)
    expect(up.y).toBeGreaterThan(0)
    expect(Math.abs(up.x)).toBeLessThan(1e-6)
    expect(right.x).toBeGreaterThan(0)
  })

  it('places 85°S near the image edge', () => {
    // 85 S is ~152 km from the pole; the product spans +/- 151.7 km.
    expect(polarRadius(-85)).toBeGreaterThan(150000)
    expect(polarRadius(-85)).toBeLessThan(155000)
  })

  it('agrees with the Python LolaPolar.to_px for Shackleton (89.67 S, 129.8 E)', () => {
    // Python: row,col = 3791.5 - y/40, x/40 + 3791.5  -> scaled by 948/7584
    const { x, y } = polarXY(-89.67, 129.8)
    const [yi, xi] = polarToImage(-89.67, 129.8, img)
    expect(xi).toBeCloseTo((x / 40 + 3792) / 8, 1)
    expect(img.px - yi).toBeCloseTo((3792 - y / 40) / 8, 1)
  })
})
