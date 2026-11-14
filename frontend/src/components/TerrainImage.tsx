import clsx from 'clsx'
import { api } from '../lib/api'
import type { Body, CandidateSite, TargetRegion } from '../lib/types'
import { useApi } from '../lib/useApi'

const TINT: Record<Body | 'earth', string> = {
  moon: 'grayscale(1) contrast(1.05)',
  mars: 'sepia(0.75) saturate(2.2) hue-rotate(-18deg) brightness(0.92)',
  earth: 'sepia(0.35) saturate(1.3) hue-rotate(5deg)',
}

function Caption({ children }: { children: React.ReactNode }) {
  return <figcaption className="mt-1.5 font-mono text-[10px] leading-snug tracking-wide text-faint uppercase">{children}</figcaption>
}

/** Hillshade of the target's surroundings with the analysis window outlined. */
export function TargetTerrain({ target, className, caption = true }: { target: TargetRegion; className?: string; caption?: boolean }) {
  const f = target.image.window_frac
  return (
    <figure className={className}>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-void">
        <img src={target.image.src} alt={`Shaded relief around ${target.name}`} className="h-full w-full object-cover" style={{ filter: TINT[target.body] }} loading="lazy" />
        <span
          aria-hidden
          className="absolute border-[1.5px] border-accent shadow-[0_0_0_9999px_rgba(7,17,31,0.25)]"
          style={{ left: `${50 - f * 50}%`, top: `${50 - f * 50}%`, width: `${f * 100}%`, height: `${f * 100}%` }}
        />
      </div>
      {caption && <Caption>{target.image.source} · box = {target.window_m / 1000} km analysis window</Caption>}
    </figure>
  )
}

/** The Earth patch, cropped from the tile hillshade rendered from NASADEM. */
export function PatchTerrain({ site, className, caption = true }: { site: CandidateSite; className?: string; caption?: boolean }) {
  const layers = useApi('mapLayers', api.mapLayers)
  const tile = layers.data?.earth_tiles.find((t) => t.id === site.tile_id)
  if (!tile) return <div className={clsx('aspect-square animate-pulse rounded-lg bg-raised/60', className)} />
  const [x0, y0, x1, y1] = site.image_box
  const bw = x1 - x0
  const bh = y1 - y0
  const [W, H] = tile.image_px
  return (
    <figure className={className}>
      <div
        role="img"
        aria-label={`Shaded relief of ${site.name}`}
        className="overflow-hidden rounded-lg border border-line bg-void bg-no-repeat"
        style={{
          aspectRatio: `${bw * W} / ${bh * H}`,
          backgroundImage: `url(${tile.image})`,
          backgroundSize: `${100 / bw}% ${100 / bh}%`,
          backgroundPosition: `${bw < 1 ? (x0 / (1 - bw)) * 100 : 0}% ${bh < 1 ? (y0 / (1 - bh)) * 100 : 0}%`,
          filter: TINT.earth,
        }}
      />
      {caption && <Caption>Hillshade from NASADEM {site.tile_id} · analysis window</Caption>}
    </figure>
  )
}
