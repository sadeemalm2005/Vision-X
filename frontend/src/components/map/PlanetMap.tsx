import L from 'leaflet'
import clsx from 'clsx'
import { useEffect } from 'react'
import { LayersControl, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Body } from '../../lib/types'
import { AutoResize } from './AutoResize'

/**
 * Real planetary imagery from NASA Solar System Treks (WMTS, equirectangular,
 * same tile grid as Leaflet's EPSG:4326 CRS). Display only: these tiles are a
 * visual reference and are NOT used by the similarity engine.
 */
const TREK = 'https://trek.nasa.gov/tiles'
const LAYERS: Record<Body, { name: string; url: string; maxNative: number; attribution: string }[]> = {
  moon: [
    {
      name: 'LRO WAC mosaic',
      url: `${TREK}/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`,
      maxNative: 8,
      attribution: 'NASA/GSFC/Arizona State University · NASA Moon Trek',
    },
  ],
  mars: [
    {
      name: 'Viking colour mosaic',
      url: `${TREK}/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`,
      maxNative: 7,
      attribution: 'NASA/JPL/USGS · NASA Mars Trek',
    },
    {
      name: 'MOLA shaded relief',
      url: `${TREK}/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`,
      maxNative: 7,
      attribution: 'NASA/JPL/GSFC MOLA Science Team · NASA Mars Trek',
    },
  ],
}

const ACCENT: Record<Body, string> = { moon: '#C9D2DF', mars: '#D98655' }

function targetIcon(body: Body) {
  const c = ACCENT[body]
  const html = `<div style="position:relative;width:30px;height:30px">
    <span style="position:absolute;inset:0;border-radius:9999px;border:1.5px solid ${c}"></span>
    <span style="position:absolute;inset:9px;border-radius:9999px;background:${c};box-shadow:0 0 0 3px rgba(7,17,31,.8)"></span>
  </div>`
  return L.divIcon({ html, className: 'e2m-marker', iconSize: [30, 30], iconAnchor: [15, 15] })
}

function Recenter({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], zoom, { animate: true })
  }, [map, lat, lon, zoom])
  return null
}

export interface PlanetPoint {
  id: string
  name: string
  lat: number
  lon: number
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
  const layers = LAYERS[body]
  const focus = points.find((p) => p.id === selectedId) ?? points[0]
  return (
    <div className={clsx('relative overflow-hidden rounded-[var(--radius-card)] border border-line', className)}>
      <MapContainer
        // Remount when the body changes: tiles and CRS context differ.
        key={body}
        crs={L.CRS.EPSG4326}
        center={focus ? [focus.lat, focus.lon] : [0, 0]}
        zoom={focus ? zoom : 1}
        minZoom={1}
        maxZoom={9}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1}
        className="h-full w-full"
      >
        <LayersControl position="topright">
          {layers.map((l, i) => (
            <LayersControl.BaseLayer key={l.name} name={l.name} checked={i === 0}>
              <TileLayer url={l.url} maxNativeZoom={l.maxNative} maxZoom={9} noWrap attribution={l.attribution} />
            </LayersControl.BaseLayer>
          ))}
        </LayersControl>
        <AutoResize />
        {focus && <Recenter lat={focus.lat} lon={focus.lon} zoom={zoom} />}
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={targetIcon(body)}
            opacity={p.id === focus?.id ? 1 : 0.55}
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
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md bg-void/80 px-2 py-1 font-mono text-[10px] tracking-wide text-muted uppercase">
        Imagery reference · not analysed
      </div>
    </div>
  )
}
