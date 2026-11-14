import clsx from 'clsx'
import type { CSSProperties } from 'react'

const TEXTURES = {
  earth: '/textures/earth.jpg', // NASA Blue Marble (GIBS)
  moon: '/textures/moon.jpg', // LRO WAC global mosaic (NASA Moon Trek)
  mars: '/textures/mars.jpg', // Viking MDIM 2.1 colour mosaic (NASA Mars Trek)
} as const

const GLOW = {
  earth: 'rgb(76 159 216 / 0.35)',
  moon: 'rgb(201 210 223 / 0.18)',
  mars: 'rgb(217 134 85 / 0.25)',
} as const

/**
 * A rotating sphere made from a real global equirectangular mosaic scrolled
 * behind a circular mask with terminator shading. Lightweight (no WebGL) and
 * static under prefers-reduced-motion.
 */
export function Planet({
  body,
  size,
  spin = 120,
  className,
  label,
}: {
  body: keyof typeof TEXTURES
  size: number | string
  spin?: number
  className?: string
  label?: string
}) {
  const d = typeof size === 'number' ? `${size}px` : size
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx('planet shrink-0', className)}
      style={
        {
          '--d': d,
          '--spin': `${spin}s`,
          backgroundImage: `url(${TEXTURES[body]})`,
          filter: `drop-shadow(0 0 calc(${d} * 0.12) ${GLOW[body]})`,
        } as CSSProperties
      }
    />
  )
}
