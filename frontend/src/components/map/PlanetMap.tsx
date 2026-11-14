import L from 'leaflet'
import clsx from 'clsx'
import { useEffect, useMemo } from 'react'
import { Circle, ImageOverlay, LayersControl, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { api } from '../../lib/api'
import { polarRadius, polarToImage } from '../../lib/polar'
import type { Body } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { AutoResize } from './AutoResize'

/**
 * Mars: NASA Solar System Treks imagery (equirectangular, matches Leaflet's
 * EPSG:4326 grid). Moon: the project's LOLA south-pole DEM rendered as a
 * hillshade in its native polar stereographic projection, because global
 * equirectangular tiles collapse the pole into a smeared strip.
 * Display only: imagery is never used by the similarity engine.
 */
const TREK = 'https://trek.nasa.gov/tiles'
const MARS_LAYERS = [
  {
    name: 'Viking colour mosaic',
    url: `${TREK}/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`,
    attribution: 'NASA/JPL/USGS · NASA Mars Trek',
  },
  {
    name: 'MOLA shaded relief',
    url: `${TREK}/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`,
    attribution: 'NASA/JPL/GSFC MOLA Science Team · NASA Mars Trek',
  },
]

const ACCENT: Record<Body, string> = { moon: '#C9D2DF', mars: '#D98655' }

function targetIcon(body: Body, active: boolean) {
  const c = ACCENT[body]
  const s = active ? 30 : 22
  const html = `<div style="position:relative;width:${s}px;height:${s}px">
    <span style="position:absolute;inset:0;border-radius:9999px;border:1.5px solid ${c}"></span>
    <span style="position:absolute;inset:${s / 3}px;border-radius:9999px;background:${c};box-shadow:0 0 0 3px rgba(7,17,31,.8)"></span>
  </div>`
  return L.divIcon({ html, className: 'e2m-marker', iconSize: [s, s], iconAnchor: [s / 2, s / 2] })
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center[0], center[1], zoom])
  return null
}

export interface PlanetPoint {
  id: string
  name: string
  lat: number
  lon: number
}

function MarkerLayer({ body, points, selectedId, onSelect, toLatLng }: { body: Body; points: PlanetPoint[]; selectedId?: string | null; onSelect?: (id: string) => void; toLatLng: (p: PlanetPoint) => [number, number] }) {
  return (
    <>
      {points.map((p) => (
        <Marker
          key={p.id}
          position={toLatLng(p)}
          icon={targetIcon(body, p.id === selectedId || points.length === 1)}
          zIndexOffset={p.id === selectedId ? 1000 : 0}
          title={p.name}
          alt={p.name}
          keyboard
          eventHandlers={{ click: () => onSelect?.(p.id) }}
        >
          <Tooltip direction="top" offset={[0, -14]} opacity={1}>
            {p.name}
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}

function MoonPolarMap({ points, selectedId, onSelect, focusZoom }: { points: PlanetPoint[]; selectedId?: string | null; onSelect?: (id: string) => void; focusZoom: boolean }) {
  const layers = useApi('mapLayers', api.mapLayers)
  const ov = layers.data?.moon_overview
  const toLatLng = useMemo(() => (p: PlanetPoint) => (ov ? polarToImage(p.lat, p.lon, ov) : ([0, 0] as [number, number])), [ov])
  if (!ov) return <div className="grid h-full place-items-center text-xs text-muted">{layers.error ? 'Map unavailable' : 'Loading map…'}</div>
  const focus = points.find((p) => p.id === selectedId)
  const center: [number, number] = focus && focusZoom ? toLatLng(focus) : [ov.px / 2, ov.px / 2]
  const scale = ov.extent_m / ov.px
  return (
    <MapContainer
      crs={L.CRS.Simple}
      center={center}
      zoom={focus && focusZoom ? 1 : -1}
      minZoom={-2}
      maxZoom={3}
      zoomSnap={0.25}
      maxBounds={[[-100, -100], [ov.px + 100, ov.px + 100]]}
      className="h-full w-full"
      attributionControl
    >
      <ImageOverlay url={ov.src} bounds={[[0, 0], [ov.px, ov.px]]} attribution="Hillshade from LOLA LDEM_85S_40M (NASA/GSFC)" />
      {[86, 87, 88, 89].map((lat) => (
        <Circle key={lat} center={[ov.px / 2, ov.px / 2]} radius={polarRadius(-lat) / scale} interactive={false} pathOptions={{ color: '#70B8FF', weight: 0.8, opacity: 0.35, fill: false, dashArray: '3 5' }} />
      ))}
      <AutoResize />
      <Recenter center={center} zoom={focus && focusZoom ? 1 : -1} />
      <MarkerLayer body="moon" points={points} selectedId={selectedId} onSelect={onSelect} toLatLng={toLatLng} />
    </MapContainer>
  )
}

function MarsMap({ points, selectedId, onSelect, zoom }: { points: PlanetPoint[]; selectedId?: string | null; onSelect?: (id: string) => void; zoom: number }) {
  const focus = points.find((p) => p.id === selectedId) ?? points[0]
  return (
    <MapContainer
      crs={L.CRS.EPSG4326}
      center={focus ? [focus.lat, focus.lon] : [0, 0]}
      zoom={focus ? zoom : 1}
      minZoom={1}
      maxZoom={9}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1}
      className="h-full w-full"
    >
      <LayersControl position="topright">
        {MARS_LAYERS.map((l, i) => (
          <LayersControl.BaseLayer key={l.name} name={l.name} checked={i === 0}>
            <TileLayer url={l.url} maxNativeZoom={7} maxZoom={9} noWrap attribution={l.attribution} />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>
      <AutoResize />
      {focus && <Recenter center={[focus.lat, focus.lon]} zoom={zoom} />}
      <MarkerLayer body="mars" points={points} selectedId={selectedId} onSelect={onSelect} toLatLng={(p) => [p.lat, p.lon]} />
    </MapContainer>
  )
}

export function PlanetMap({
  body,
  points,
  selectedId,
  onSelect,
  zoom = 4,
  className,
}: {
  body: Body
  points: PlanetPoint[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  zoom?: number
  className?: string
}) {
  return (
    <div className={clsx('relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-base', className)}>
      {body === 'moon' ? (
        <MoonPolarMap points={points} selectedId={selectedId ?? (points.length === 1 ? points[0].id : null)} onSelect={onSelect} focusZoom={zoom >= 4} />
      ) : (
        <MarsMap points={points} selectedId={selectedId} onSelect={onSelect} zoom={zoom} />
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md bg-void/80 px-2 py-1 font-mono text-[10px] tracking-wide text-muted uppercase">
        {body === 'moon' ? 'Lunar south pole · LOLA hillshade · rings 86–89°S' : 'Imagery reference · not analysed'}
      </div>
    </div>
  )
}
