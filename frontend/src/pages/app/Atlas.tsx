import clsx from 'clsx'
import { Compass, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EarthMap } from '../../components/map/EarthMap'
import { Badge, ButtonLink, DemoBadge, ErrorState, PageHeader, Panel, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { useFeatureCatalog } from '../../lib/catalog'
import { BODY_COLOR, formatCoord, formatValue } from '../../lib/format'
import type { Body } from '../../lib/types'
import { useApi } from '../../lib/useApi'

type Filter = 'all' | Body

export default function Atlas() {
  const candidates = useApi('candidates', api.candidates)
  const catalog = useFeatureCatalog()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (candidates.data ?? []).filter(
      (c) => (filter === 'all' || c.relevant_bodies.includes(filter)) && (!q || `${c.name} ${c.country} ${c.terrain.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [candidates.data, filter, query])
  const selected = list.find((c) => c.id === selectedId) ?? list[0]

  return (
    <div>
      <PageHeader
        eyebrow="Site Atlas"
        title="Earth candidate locations"
        description="Research candidates from the project proposal. None is a pre-validated analog: suitability is only assessed against a specific target and mission in Explore & Compare."
        actions={<ButtonLink to="/app/explore"><Compass aria-hidden className="size-4" /> Compare against a target</ButtonLink>}
      />
      {candidates.error && <ErrorState error={candidates.error} onRetry={candidates.reload} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Filter by planetary body">
          {(['all', 'moon', 'mars'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={clsx('cursor-pointer rounded-md px-3 py-1.5 text-[13px] capitalize transition-colors', filter === f ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
            >
              {f === 'all' ? 'All sites' : `${f} analogs`}
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
        <div className="flex flex-col gap-4">
          {candidates.loading ? (
            <Skeleton className="h-[460px]" />
          ) : (
            <EarthMap
              sites={list.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lon: c.lon, color: '#70B8FF' }))}
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
                  <p className="text-[14px] font-medium">{c.name}</p>
                  <p className="text-[12px] text-muted">{c.country}</p>
                  <div className="mt-2 flex gap-1.5">
                    {c.relevant_bodies.map((b) => <span key={b} className="size-2 rounded-full" style={{ background: BODY_COLOR[b] }} title={`${b} analog candidate`} />)}
                  </div>
                </button>
              </li>
            ))}
            {!candidates.loading && list.length === 0 && <li className="text-[13px] text-muted">No sites match the current filter.</li>}
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
                <Badge tone="neutral">Candidate</Badge>
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
              <div>
                <p className="eyebrow mb-2 flex items-center justify-between">Summary measurements <DemoBadge label="Demo" /></p>
                <dl className="divide-y divide-line rounded-lg border border-line">
                  {Object.entries(selected.measurements).map(([fid, m]) => (
                    <div key={fid} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                      <dt className="text-muted">{catalog.byId[fid]?.name ?? fid}</dt>
                      <dd className="num">{formatValue(m.value, catalog.byId[fid])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="text-[12.5px] text-muted"><span className="text-ink">Data quality: </span>{selected.data_quality}</p>
              <p className="rounded-lg border border-mars/25 bg-mars/[0.06] px-3 py-2.5 text-[12.5px] text-mars/90"><span className="font-medium text-mars">Caution: </span>{selected.caution}</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
