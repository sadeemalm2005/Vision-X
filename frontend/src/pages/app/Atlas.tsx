import clsx from 'clsx'
import { CircleSlash, Compass, Database, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EarthMap } from '../../components/map/EarthMap'
import { Badge, ButtonLink, ErrorState, PageHeader, Panel, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { BODY_COLOR, formatCoord } from '../../lib/format'
import type { Body } from '../../lib/types'
import { useApi } from '../../lib/useApi'

type Filter = 'all' | Body | 'data'

export default function Atlas() {
  const sites = useApi('sites', api.sites)
  const layers = useApi('mapLayers', api.mapLayers)
  const meta = useApi('meta', api.meta)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (sites.data ?? []).filter(
      (c) =>
        (filter === 'all' || (filter === 'data' ? c.data_status === 'real' : c.relevant_bodies.includes(filter))) &&
        (!q || `${c.name} ${c.country} ${c.terrain.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [sites.data, filter, query])
  const selected = list.find((c) => c.id === selectedId) ?? list[0]
  const tiles = layers.data?.earth_tiles ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Site Atlas"
        title="Earth candidate locations"
        description="Research candidates from the project proposal. A site can only be scored once an elevation tile for it is connected; none is a pre-validated analog."
        actions={<ButtonLink to="/app/explore"><Compass aria-hidden className="size-4" /> Compare against a target</ButtonLink>}
      />
      {sites.error && <ErrorState error={sites.error} onRetry={sites.reload} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap rounded-lg border border-line p-0.5" role="group" aria-label="Filter sites">
          {([['all', 'All sites'], ['data', 'With data'], ['moon', 'Moon analogs'], ['mars', 'Mars analogs']] as [Filter, string][]).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={clsx('cursor-pointer rounded-md px-3 py-1.5 text-[13px] transition-colors', filter === f ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative flex items-center sm:w-72">
          <span className="sr-only">Search sites</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, country, terrain"
            className="h-10 w-full rounded-[10px] border border-line-strong bg-base pr-3 pl-9 text-[13.5px] placeholder:text-faint focus:border-accent/60 focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          {sites.loading ? (
            <Skeleton className="h-[460px]" />
          ) : (
            <EarthMap
              sites={list.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lon: c.lon, color: c.data_status === 'real' ? '#6FD4A8' : '#9BAABC' }))}
              overlays={tiles.map((t) => ({ image: t.image, bounds: t.bounds }))}
              selectedId={selected?.id}
              onSelect={setSelectedId}
              flyToSelection
              className="h-[380px] sm:h-[460px]"
            />
          )}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={c.id === selected?.id}
                  className={clsx('w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors', c.id === selected?.id ? 'border-accent/50 bg-raised' : 'border-line bg-surface hover:border-line-strong')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-medium">{c.name}</p>
                    {c.data_status === 'real' ? <Badge tone="good">Data</Badge> : <Badge>No data</Badge>}
                  </div>
                  <p className="text-[12px] text-muted">{c.country}</p>
                  <div className="mt-2 flex gap-1.5">
                    {c.relevant_bodies.map((b) => <span key={b} className="size-2 rounded-full" style={{ background: BODY_COLOR[b] }} title={`${b} analog candidate`} />)}
                  </div>
                </button>
              </li>
            ))}
            {!sites.loading && list.length === 0 && <li className="text-[13px] text-muted">No sites match the current filter.</li>}
          </ul>
        </div>

        {selected && (
          <Panel as="article" className="self-start xl:sticky xl:top-8">
            <div className="border-b border-line px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-semibold">{selected.name}</h2>
                  <p className="text-[13px] text-muted">{selected.country}</p>
                </div>
                {selected.data_status === 'real' ? <Badge tone="good">Elevation data</Badge> : <Badge>No data yet</Badge>}
              </div>
              <p className="num mt-2 text-[12px] text-faint">{formatCoord(selected.lat, selected.lon)}</p>
            </div>
            <div className="flex flex-col gap-5 px-5 py-5 text-[13.5px] leading-relaxed">
              <p className="text-muted">{selected.description}</p>
              <div>
                <p className="eyebrow mb-2">Terrain</p>
                <div className="flex flex-wrap gap-1.5">{selected.terrain.map((t) => <Badge key={t}>{t}</Badge>)}</div>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Potential comparison</p>
                <p>{selected.potential_comparison}</p>
              </div>
              <div>
                <p className="eyebrow mb-2">Research applications</p>
                <div className="flex flex-wrap gap-1.5">{selected.applications.map((t) => <Badge key={t} tone="accent">{t}</Badge>)}</div>
              </div>
              {selected.data_status === 'real' ? (
                <div className="rounded-lg border border-good/25 bg-good/[0.05] px-3 py-2.5 text-[12.5px] text-muted">
                  <p className="mb-1 flex items-center gap-1.5 font-medium text-good"><Database aria-hidden className="size-3.5" /> Connected: NASADEM {selected.tiles.join(', ')}</p>
                  Searched as {meta.data?.counts.patches.lunar_fine ?? '…'} windows of 10 km for lunar comparisons and{' '}
                  {meta.data?.counts.patches.mars_regional ?? '…'} windows of 30 km for Mars comparisons. The shaded relief on the map is rendered from this tile.
                </div>
              ) : (
                <div className="rounded-lg border border-line bg-base/60 px-3 py-2.5 text-[12.5px] text-muted">
                  <p className="mb-1 flex items-center gap-1.5 font-medium text-ink"><CircleSlash aria-hidden className="size-3.5" /> Not scored yet</p>
                  No elevation data is connected for this site, so it is not part of any ranking.
                  {selected.suggested_tile && <> Adding <span className="text-ink">{selected.suggested_tile}</span> to the pipeline would enable it.</>}
                </div>
              )}
              <p className="rounded-lg border border-mars/25 bg-mars/[0.06] px-3 py-2.5 text-[12.5px] text-mars/90"><span className="font-medium text-mars">Caution: </span>{selected.caution}</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
