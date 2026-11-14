import clsx from 'clsx'
import { ArrowRight, Columns2, Compass, FileText, ListOrdered, Map as MapIcon, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RankingRanges } from '../../components/charts/Charts'
import { EarthMap } from '../../components/map/EarthMap'
import { PlanetMap } from '../../components/map/PlanetMap'
import { ConfidenceBadge, Disclaimer, ScoreDial } from '../../components/results/ResultParts'
import { SaveButton } from '../../components/results/SaveButton'
import { Badge, ButtonLink, DemoBadge, DemoNotice, EmptyState, Panel, PanelHeader, Term } from '../../components/ui'
import { featureName, useFeatureCatalog } from '../../lib/catalog'
import { BODY_COLOR, BODY_LABEL, formatCoord, formatDate, pct, scoreColor } from '../../lib/format'
import { history, useHistory } from '../../lib/storage'
import type { AnalysisResult } from '../../lib/types'

const SERIES = ['#70B8FF', '#8C9EFF', '#4C9FD8', '#C9D2DF', '#6FD4A8', '#E6C26E', '#D98655', '#9BAABC']

export function exploreLink(a: AnalysisResult) {
  const q = new URLSearchParams({ body: a.body, target: a.target.id, mission: a.mission.id, features: a.weights.map((w) => w.feature_id).join(',') })
  return `/app/explore?${q}`
}

function StackedContributions({ analysis, catalog }: { analysis: AnalysisResult; catalog: ReturnType<typeof useFeatureCatalog>['byId'] }) {
  const ids = analysis.weights.map((w) => w.feature_id)
  return (
    <div>
      <ul className="flex flex-col gap-3">
        {analysis.results.map((r) => (
          <li key={r.site.id} className="grid grid-cols-[minmax(100px,150px)_1fr] items-center gap-3">
            <span className="truncate text-[13px]">{r.site.name}</span>
            <div className="flex h-3.5 overflow-hidden rounded-full bg-raised/60" role="img" aria-label={`${r.site.name}: ${r.lower_bound.toFixed(0)} points from compared features`}>
              {ids.map((fid, i) => {
                const f = r.features.find((x) => x.feature_id === fid)
                const c = f?.contribution ?? 0
                return c > 0 ? <span key={fid} title={`${featureName(catalog, fid)}: ${c.toFixed(1)} pts`} style={{ width: `${c}%`, background: SERIES[i % SERIES.length] }} className="border-r border-surface last:border-0" /> : null
              })}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
        {ids.map((fid, i) => (
          <span key={fid} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
            {featureName(catalog, fid, true)} <span className="num text-faint">{pct(analysis.weights[i].weight)}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">Bar length = points earned from compared features (unadjusted sum, i.e. the lower bound). Empty space = points lost to dissimilarity or missing data.</p>
    </div>
  )
}

export default function Results() {
  const { analysisId } = useParams()
  const all = useHistory()
  const analysis = analysisId ? all.find((a) => a.id === analysisId) : all[0]
  const catalog = useFeatureCatalog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [split, setSplit] = useState(false)

  const selected = analysis?.results.find((r) => r.site.id === (selectedId ?? analysis.results[0]?.site.id))
  const mapSites = useMemo(
    () => analysis?.results.map((r) => ({ id: r.site.id, name: r.site.name, lat: r.site.lat, lon: r.site.lon, rank: r.rank, color: scoreColor(r.score), dimmed: r.withheld })) ?? [],
    [analysis],
  )

  if (!analysis) {
    return (
      <EmptyState
        className="mt-10"
        icon={<ListOrdered className="size-5" />}
        title={analysisId ? 'Analysis not found in this browser' : 'No analyses yet'}
        action={<ButtonLink to="/app/explore"><Compass aria-hidden className="size-4" /> Start an analysis</ButtonLink>}
      >
        {analysisId
          ? 'Results are stored locally in the browser that ran them. It may have been removed, or run on another device.'
          : 'Run your first comparison in Explore & Compare. Results appear here, ranked and explained.'}
      </EmptyState>
    )
  }

  const scored = analysis.results.filter((r) => r.score !== null)
  const meanCoverage = analysis.results.reduce((a, r) => a + r.coverage, 0) / analysis.results.length
  const top = analysis.results[0]

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-3 flex flex-wrap items-center gap-2">
            Match results <span className="text-faint">·</span> <span className="num normal-case tracking-normal">{formatDate(analysis.created_at)}</span>
          </p>
          <h1 className="text-[28px] leading-tight font-semibold sm:text-[34px]">
            <span style={{ color: BODY_COLOR[analysis.body] }}>{analysis.target.name}</span>
            <span className="text-faint"> → </span>Earth
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={analysis.body}>{BODY_LABEL[analysis.body]}</Badge>
            <Badge tone="accent">{analysis.mission.name}</Badge>
            <Badge>{analysis.weights.length} features</Badge>
            {analysis.data_mode === 'demo' && <DemoBadge label="Illustrative demo results" />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={exploreLink(analysis)} variant="secondary"><SlidersHorizontal aria-hidden className="size-4" /> Adjust analysis</ButtonLink>
          <ButtonLink to="/app/explore"><Compass aria-hidden className="size-4" /> New analysis</ButtonLink>
        </div>
      </header>

      {analysis.data_mode === 'demo' && <DemoNotice />}

      {/* summary */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line lg:grid-cols-4">
        {[
          ['Top-ranked site', top.site.name, top.score !== null ? `${top.score.toFixed(0)} / 100` : 'score withheld'],
          ['Sites scored', `${scored.length} of ${analysis.results.length}`, `${analysis.results.length - scored.length} withheld for missing data`],
          [<Term key="c" term="coverage">Mean coverage</Term>, pct(meanCoverage), 'share of weight backed by data'],
          ['Features compared', analysis.weights.map((w) => featureName(catalog.byId, w.feature_id, true)).join(' · '), analysis.target.region_type],
        ].map(([k, v, h], i) => (
          <div key={i} className="min-w-0 bg-surface px-5 py-4">
            <p className="eyebrow">{k}</p>
            <p className={clsx('mt-2 truncate font-display font-semibold', i === 3 ? 'text-[14px] leading-snug whitespace-normal' : 'text-[20px]')}>{v}</p>
            <p className="mt-1 truncate text-[12px] text-muted">{h}</p>
          </div>
        ))}
      </div>

      {/* map + selected */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow="Ranked candidates"
            title={split ? 'Planetary target vs Earth candidate' : 'Candidate sites on Earth'}
            action={
              <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Map view">
                <button type="button" onClick={() => setSplit(false)} aria-pressed={!split} className={clsx('flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs', !split ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}>
                  <MapIcon aria-hidden className="size-3.5" /> Earth
                </button>
                <button type="button" onClick={() => setSplit(true)} aria-pressed={split} className={clsx('flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs', split ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}>
                  <Columns2 aria-hidden className="size-3.5" /> Split view
                </button>
              </div>
            }
          />
          <div className={clsx('grid gap-3 p-3', split && 'md:grid-cols-2')}>
            {split && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow px-1" style={{ color: BODY_COLOR[analysis.body] }}>{analysis.target.name}</p>
                <PlanetMap body={analysis.body} points={[{ id: analysis.target.id, name: analysis.target.name, lat: analysis.target.lat, lon: analysis.target.lon }]} zoom={5} className="h-[340px] sm:h-[420px]" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              {split && <p className="eyebrow px-1 text-earth">{selected?.site.name ?? 'Earth'}</p>}
              <EarthMap sites={mapSites} selectedId={selected?.site.id} onSelect={setSelectedId} flyToSelection={split} className="h-[340px] sm:h-[420px]" />
            </div>
          </div>
        </Panel>

        {selected && (
          <Panel as="article" aria-label={`Selected site: ${selected.site.name}`} className="flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5">
              <div className="min-w-0">
                <p className="eyebrow">Rank #{selected.rank}</p>
                <h2 className="mt-1 text-[20px] font-semibold">{selected.site.name}</h2>
                <p className="mt-0.5 text-[13px] text-muted">{selected.site.country}</p>
                <p className="num mt-1 text-[11.5px] text-faint">{formatCoord(selected.site.lat, selected.site.lon)}</p>
              </div>
              <ScoreDial score={selected.score} size={84} />
            </div>
            <div className="flex flex-1 flex-col gap-4 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge confidence={selected.confidence} coverage={selected.coverage} />
                {selected.score !== null && selected.coverage < 1 && <Badge>range {selected.lower_bound.toFixed(0)}–{selected.upper_bound.toFixed(0)}</Badge>}
              </div>
              <p className="text-[14px] leading-relaxed">{selected.explanation.headline}</p>
              <ul className="flex flex-col gap-2">
                {selected.features.map((f) => (
                  <li key={f.feature_id} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-[12.5px]">
                    <span className="truncate text-muted">{featureName(catalog.byId, f.feature_id, true)}</span>
                    <span className="h-1.5 rounded-full bg-raised">
                      {f.similarity !== null ? (
                        <span className="block h-full rounded-full" style={{ width: `${f.similarity * 100}%`, background: scoreColor(f.similarity * 100) }} />
                      ) : (
                        <span className="block h-full rounded-full bg-[repeating-linear-gradient(135deg,rgba(155,170,188,.25)_0_3px,transparent_3px_6px)]" />
                      )}
                    </span>
                    <span className="num text-right text-faint">{f.similarity !== null ? f.similarity.toFixed(2) : 'n/a'}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] leading-relaxed text-muted"><span className="text-ink">Where it differs: </span>gravity, atmosphere, radiation, temperature and surface materials are not reproduced.</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <ButtonLink to={`/app/results/${analysis.id}/site/${selected.site.id}`} size="sm"><FileText aria-hidden className="size-3.5" /> Open full report</ButtonLink>
                <SaveButton analysis={analysis} result={selected} />
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Ranking" title="Scores with uncertainty from missing data" />
          <div className="p-5">
            <RankingRanges results={analysis.results} selectedId={selected?.site.id} onSelect={setSelectedId} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Contribution" title="What each feature contributes" />
          <div className="p-5">
            <StackedContributions analysis={analysis} catalog={catalog.byId} />
          </div>
        </Panel>
      </div>

      {/* ranked list */}
      <section aria-labelledby="ranked-title">
        <h2 id="ranked-title" className="mb-4 text-[18px] font-semibold">All ranked candidates</h2>
        <ol className="flex flex-col gap-3">
          {analysis.results.map((r) => (
            <li key={r.site.id}>
              <article className={clsx('panel flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-center', r.site.id === selected?.site.id && 'border-line-strong')}>
                <div className="flex items-center gap-4 sm:w-[300px] sm:shrink-0">
                  <span className="num w-6 text-[15px] text-faint">#{r.rank}</span>
                  <ScoreDial score={r.score} size={58} stroke={4} />
                  <div className="min-w-0">
                    <h3 className="truncate text-[16px] font-semibold">{r.site.name}</h3>
                    <p className="truncate text-[12.5px] text-muted">{r.site.country}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-relaxed">{r.explanation.headline}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <ConfidenceBadge confidence={r.confidence} coverage={r.coverage} />
                    {r.explanation.strengths.slice(0, 3).map((s) => <Badge key={s.feature_id} tone="good">{featureName(catalog.byId, s.feature_id, true)}</Badge>)}
                    {r.explanation.differences.slice(0, 2).map((s) => <Badge key={s.feature_id} tone="bad">{featureName(catalog.byId, s.feature_id, true)}</Badge>)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <SaveButton analysis={analysis} result={r} compact />
                  <ButtonLink to={`/app/results/${analysis.id}/site/${r.site.id}`} variant="secondary" size="sm">
                    Report <ArrowRight aria-hidden className="size-3.5" />
                  </ButtonLink>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {/* method */}
      <Panel>
        <PanelHeader eyebrow="Method" title="How these results were calculated" action={<Link to="/app/methodology" className="text-[13px] text-accent hover:underline">Full methodology</Link>} />
        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr]">
          <p className="font-display text-[22px] whitespace-nowrap">{analysis.scoring.formula}</p>
          <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted">
            <p>{analysis.scoring.rule}</p>
            <p>
              Data sources referenced: <span className="num text-ink/80">{analysis.datasets_used.join(', ')}</span>. {analysis.data_mode === 'demo' && 'All values are synthetic placeholders labelled with their planned source.'}
            </p>
            <p>Mission caveat: {analysis.mission.caveat}</p>
          </div>
        </div>
      </Panel>

      <Disclaimer text={analysis.disclaimer} />
      <p className="text-center text-[12px] text-faint">
        Stored in this browser only. <button type="button" className="cursor-pointer text-muted underline-offset-2 hover:underline" onClick={() => history.remove(analysis.id)}>Delete this analysis</button>
      </p>
    </div>
  )
}
