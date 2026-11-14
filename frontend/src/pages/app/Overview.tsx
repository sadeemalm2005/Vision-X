import { ArrowRight, Compass, Database, History, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EarthMap } from '../../components/map/EarthMap'
import { Planet } from '../../components/Planet'
import { ConfidenceBadge, ScoreDial } from '../../components/results/ResultParts'
import { Badge, ButtonLink, DemoBadge, DemoNotice, EmptyState, ErrorState, Panel, PanelHeader, Skeleton, Stat } from '../../components/ui'
import { api } from '../../lib/api'
import { BODY_COLOR, BODY_LABEL, formatDate, formatResolution, scoreColor } from '../../lib/format'
import { useHistory, useSaved } from '../../lib/storage'
import { useApi } from '../../lib/useApi'

export default function Overview() {
  const meta = useApi('meta', api.meta)
  const candidates = useApi('candidates', api.candidates)
  const datasets = useApi('datasets', api.datasets)
  const all = useHistory()
  const savedList = useSaved()
  const latest = all[0]

  const statusCount = (s: string) => datasets.data?.filter((d) => d.status === s).length ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* hero strip */}
      <section className="panel relative overflow-hidden">
        <div className="starfield pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <p className="eyebrow mb-3">Overview</p>
            <h1 className="text-[28px] leading-tight font-semibold sm:text-[34px]">Mission control for analog site discovery</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Select a lunar or Martian target, choose what you want to test, and rank Earth sites by measurable terrain similarity, with every
              limitation spelled out.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink to="/app/explore"><Compass aria-hidden className="size-4" /> New analysis</ButtonLink>
              {latest && <ButtonLink to={`/app/results/${latest.id}`} variant="secondary">Latest results <ArrowRight aria-hidden className="size-4" /></ButtonLink>}
            </div>
          </div>
          <div aria-hidden className="relative hidden h-[150px] w-[260px] lg:block">
            <div className="absolute top-2 left-0"><Planet body="moon" size={70} spin={150} /></div>
            <div className="absolute top-6 left-[78px]"><Planet body="earth" size={118} spin={90} /></div>
            <div className="absolute right-0 bottom-0"><Planet body="mars" size={62} spin={110} /></div>
          </div>
        </div>
      </section>

      {meta.error && <ErrorState error={meta.error} onRetry={meta.reload} />}
      {meta.data?.data_mode === 'demo' && (
        <DemoNotice>
          <strong className="font-semibold text-warn">Running in demonstration mode.</strong> Region and site measurements are synthetic
          placeholders. Rankings show how the engine behaves, not scientific findings. Project datasets will replace them without changing this interface.
        </DemoNotice>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Candidate sites" value={meta.data?.counts.candidates ?? '—'} hint="Research candidates, not validated analogs" />
        <Stat
          label="Selected target"
          value={latest ? <span style={{ color: BODY_COLOR[latest.body] }}>{BODY_LABEL[latest.body]}</span> : '—'}
          hint={latest ? latest.target.name : 'No analysis yet'}
        />
        <Stat label="Current mission" value={<span className="text-[20px]">{latest?.mission.name ?? '—'}</span>} hint={latest ? `${latest.weights.length} features weighted` : 'Choose one in Explore'} />
        <Stat label="Saved sites" value={savedList.length} hint={`${all.length} analyses in this browser`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* latest analysis */}
        <Panel>
          <PanelHeader
            eyebrow="Latest analysis"
            title={latest ? `${latest.target.name} · ${latest.mission.name}` : 'No analysis yet'}
            action={latest ? <span className="num text-[12px] text-faint">{formatDate(latest.created_at)}</span> : undefined}
          />
          {latest ? (
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
              <EarthMap
                sites={latest.results.map((r) => ({ id: r.site.id, name: r.site.name, lat: r.site.lat, lon: r.site.lon, rank: r.rank, color: scoreColor(r.score), dimmed: r.withheld }))}
                className="h-[300px]"
              />
              <div className="flex min-w-0 flex-col">
                <p className="eyebrow mb-3 flex items-center justify-between gap-2">Top matching sites {latest.data_mode === 'demo' && <DemoBadge label="Demo" />}</p>
                <ol className="flex flex-col divide-y divide-line">
                  {latest.results.slice(0, 4).map((r) => (
                    <li key={r.site.id}>
                      <Link to={`/app/results/${latest.id}/site/${r.site.id}`} className="flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-raised/50">
                        <span className="num w-5 text-[13px] text-faint">{r.rank}</span>
                        <ScoreDial score={r.score} size={42} stroke={3} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{r.site.name}</span>
                          <span className="block truncate text-[12px] text-muted">{r.site.country}</span>
                        </span>
                        <span className="hidden sm:inline-flex"><ConfidenceBadge confidence={r.confidence} coverage={r.coverage} /></span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link to={`/app/results/${latest.id}`} className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[13px] text-accent hover:underline">
                  View all results <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState icon={<Sparkles className="size-5" />} title="Run your first comparison" action={<ButtonLink to="/app/explore">Open Explore & Compare</ButtonLink>}>
                Pick the Moon or Mars, a target region and a mission objective. Results will appear here.
              </EmptyState>
            </div>
          )}
        </Panel>

        {/* recent */}
        <Panel>
          <PanelHeader eyebrow="History" title="Recent comparisons" action={<Link to="/app/saved" className="text-[13px] text-accent hover:underline">Manage</Link>} />
          {all.length ? (
            <ul className="divide-y divide-line">
              {all.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link to={`/app/results/${a.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-raised/40">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: BODY_COLOR[a.body] }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">{a.target.name}</span>
                      <span className="block truncate text-[12px] text-muted">{a.mission.name} · top: {a.results[0]?.site.name}</span>
                    </span>
                    <span className="num shrink-0 text-[11.5px] text-faint">{new Date(a.created_at).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 px-5 py-8 text-[13px] text-muted">
              <History aria-hidden className="size-4 text-faint" /> Analyses you run are listed here (stored in this browser).
            </div>
          )}
        </Panel>
      </div>

      {/* data availability */}
      <Panel>
        <PanelHeader
          eyebrow="Data availability"
          title="Sources and integration status"
          action={<Link to="/app/methodology" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"><Database aria-hidden className="size-3.5" /> Methodology</Link>}
        />
        {datasets.error ? (
          <div className="p-5"><ErrorState error={datasets.error} onRetry={datasets.reload} /></div>
        ) : !datasets.data ? (
          <div className="grid gap-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-px border-b border-line bg-line">
              {[
                ['Connected for analysis', statusCount('connected'), 'text-good'],
                ['Planned', statusCount('planned'), 'text-warn'],
                ['Imagery reference only', statusCount('imagery_only'), 'text-accent'],
              ].map(([k, v, c]) => (
                <div key={k as string} className="bg-surface px-5 py-3">
                  <p className={`font-display text-[22px] font-semibold ${c}`}>{v}</p>
                  <p className="text-[12px] text-muted">{k}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] tracking-wide text-faint uppercase">
                    <th scope="col" className="px-5 py-2 font-medium">Dataset</th>
                    <th scope="col" className="px-5 py-2 font-medium">Body</th>
                    <th scope="col" className="px-5 py-2 font-medium">Nominal resolution</th>
                    <th scope="col" className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.data.map((d) => (
                    <tr key={d.id} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-2.5">{d.name}</td>
                      <td className="px-5 py-2.5"><Badge tone={d.body}>{d.body}</Badge></td>
                      <td className="num px-5 py-2.5 text-muted">{formatResolution(d.nominal_resolution_m)}</td>
                      <td className="px-5 py-2.5">
                        <Badge tone={d.status === 'connected' ? 'good' : d.status === 'planned' ? 'warn' : 'accent'}>
                          {d.status === 'imagery_only' ? 'Imagery only' : d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
      {candidates.error && <ErrorState error={candidates.error} onRetry={candidates.reload} />}
    </div>
  )
}
