/**
 * South-polar stereographic projection for the LOLA overview image.
 * Mirrors backend/app/pipeline/readers.py (LolaPolar) so markers drawn on the
 * hillshade line up with the DEM pixels the features were computed from.
 */
export const MOON_RADIUS_M = 1737400

export interface PolarImage {
  px: number // image is px x px
  extent_m: number // full width in metres
}

/** Polar-stereographic map coordinates (metres) for a south-polar point. */
export function polarXY(lat: number, lon: number): { x: number; y: number } {
  const rad = Math.PI / 180
  const rho = 2 * MOON_RADIUS_M * Math.tan(((90 + lat) * rad) / 2)
  return { x: rho * Math.sin(lon * rad), y: rho * Math.cos(lon * rad) }
}

/** Distance from the pole (metres) of a latitude circle. */
export function polarRadius(lat: number): number {
  return 2 * MOON_RADIUS_M * Math.tan((((90 + lat) * Math.PI) / 180) / 2)
}

/**
 * Leaflet CRS.Simple coordinates [yImg, xImg] in image pixels, where the image
 * occupies [[0,0],[px,px]] and yImg grows upward (image top = px).
 */
export function polarToImage(lat: number, lon: number, img: PolarImage): [number, number] {
  const s = img.extent_m / img.px
  const { x, y } = polarXY(lat, lon)
  const col = img.px / 2 + x / s
  const row = img.px / 2 - y / s
  return [img.px - row, col]
}
