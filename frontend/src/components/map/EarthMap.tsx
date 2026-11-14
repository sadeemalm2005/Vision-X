import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { ImageOverlay, LayersControl, MapContainer, Marker, Rectangle, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { scoreColor } from '../../lib/format'
import clsx from 'clsx'
import { AutoResize } from './AutoResize'

export interface MapSite {
  id: string
  name: string
  lat: number
  lon: number
  rank?: number
  color?: string
  dimmed?: boolean
}

export interface HeatCell {
  id: string
  bounds: [[number, number], [number, number]]
  score: number | null
  rank: number
  /** Overrides the score colour (e.g. terrain-cluster view). */
  color?: string
  label?: string
}

export interface DemOverlay {
  image: string
  bounds: [[number, number], [number, number]]
}

// Imagery only: these basemaps are a visual reference and are NOT analysed.
const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function markerIcon(site: MapSite, selected: boolean) {
  const color = site.color ?? '#70B8FF'
  const label = site.rank !== undefined ? String(site.rank) : ''
  const size = selected ? 34 : 28
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;opacity:${site.dimmed ? 0.45 : 1}">
      ${selected ? `<span style="position:absolute;inset:-7px;border-radius:9999px;border:1.5px solid ${color};opacity:.55"></span>` : ''}
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(7,17,31,.85),0 6px 18px rgba(0,0,0,.45);display:grid;place-items:center;color:#07111F;font:600 ${selected ? 13 : 12}px 'IBM Plex Mono',monospace">${label}</span>
    </div>`
  return L.divIcon({ html, className: 'e2m-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

function FitToSites({ sites, fitKey, maxZoom, padding }: { sites: MapSite[]; fitKey: string; maxZoom: number; padding: number }) {
  const map = useMap()
  useEffect(() => {
    if (!sites.length) return
    const bounds = L.latLngBounds(sites.map((s) => [s.lat, s.lon] as [number, number]))
    map.fitBounds(bounds, { padding: [padding, padding], maxZoom })
    // fitKey intentionally drives refits (not every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])
  return null
}

function FlyToSelected({ site }: { site?: MapSite }) {
  const map = useMap()
  useEffect(() => {
    if (!site) return
    const z = Math.max(map.getZoom(), 4)
    map.flyTo([site.lat, site.lon], z, { duration: 0.8 })
  }, [map, site])
  return null
}

export function EarthMap({
  sites,
  selectedId,
  onSelect,
  className,
  flyToSelection = false,
  maxFitZoom = 6,
  overlays = [],
  heat = [],
  fitTo,
}: {
  sites: MapSite[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  className?: string
  flyToSelection?: boolean
  maxFitZoom?: number
  /** Hillshades rendered from connected DEM tiles. */
  overlays?: DemOverlay[]
  /** Similarity heatmap: one rectangle per scored Earth patch. */
  heat?: HeatCell[]
  /** Optional explicit points to fit instead of the markers. */
  fitTo?: MapSite[]
}) {
  const fitKey = useMemo(() => (fitTo ?? sites).map((s) => s.id).sort().join('|'), [sites, fitTo])
  const selected = sites.find((s) => s.id === selectedId)

  return (
    <div className={clsx('relative overflow-hidden rounded-[var(--radius-card)] border border-line', className)}>
      <MapContainer
        center={[20, -60]}
        zoom={2}
        minZoom={2}
        maxZoom={17}
        worldCopyJump
        scrollWheelZoom
        className="h-full w-full"
        attributionControl
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite imagery">
            <TileLayer url={ESRI_IMAGERY} attribution="Imagery © Esri, Maxar, Earthstar Geographics" maxZoom={17} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Dark map">
            <TileLayer
              url={CARTO_DARK}
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        {overlays.map((o) => (
          <ImageOverlay key={o.image} url={o.image} bounds={o.bounds} opacity={0.55} attribution="Hillshade from NASADEM (NASA/JPL)" className="mix-blend-multiply" />
        ))}
        {heat.map((c) => (
          <Rectangle
            key={c.id}
            bounds={c.bounds}
            pathOptions={{
              color: c.id === selectedId ? '#F3F6FA' : (c.color ?? scoreColor(c.score)),
              weight: c.id === selectedId ? 2 : 0,
              fillColor: c.color ?? scoreColor(c.score),
              fillOpacity: c.color ? 0.42 : c.score === null ? 0.08 : 0.12 + (c.score / 100) * 0.5,
            }}
            eventHandlers={{ click: () => onSelect?.(c.id) }}
          >
            <Tooltip sticky opacity={1}>
              #{c.rank} · {c.score === null ? 'score withheld' : `${c.score.toFixed(0)} / 100`}
              {c.label ? ` · ${c.label}` : ''}
            </Tooltip>
          </Rectangle>
        ))}
        <AutoResize />
        <FitToSites sites={fitTo ?? sites} fitKey={fitKey} maxZoom={maxFitZoom} padding={fitTo ? 4 : 48} />
        {flyToSelection && <FlyToSelected site={selected} />}
        {sites.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lon]}
            icon={markerIcon(s, s.id === selectedId)}
            zIndexOffset={s.id === selectedId ? 1000 : 0}
            keyboard
            title={s.name}
            alt={s.name}
            eventHandlers={{ click: () => onSelect?.(s.id), keypress: (e) => (e.originalEvent as KeyboardEvent).key === 'Enter' && onSelect?.(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -16]} opacity={1}>
              {s.rank !== undefined ? `#${s.rank} · ` : ''}
              {s.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
