import { ArrowLeft, BrainCircuit, CheckCircle2, Printer } from 'lucide-react'
import { clusterColor } from '../../components/results/MLPanel'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { computeAxisMax, ContributionBreakdown, ElevationProfile, FingerprintRadar, MeasurementTable, SlopeDistribution } from '../../components/charts/Charts'
import { EarthMap } from '../../components/map/EarthMap'
import { PlanetMap } from '../../components/map/PlanetMap'
import { Planet } from '../../components/Planet'
import { PatchTerrain, TargetTerrain } from '../../components/TerrainImage'
import { ConfidenceBadge, CoverageExplainer, Disclaimer, ScoreDial, WhereItDiffers } from '../../components/results/ResultParts'
import { SaveButton } from '../../components/results/SaveButton'
import { Badge, Button, ButtonLink, DemoBadge, EmptyState, ErrorState, LoadingBlock, Panel, PanelHeader } from '../../components/ui'
import { api } from '../../lib/api'
import { featureName, useFeatureCatalog } from '../../lib/catalog'
import { BODY_COLOR, BODY_LABEL, formatCoord, formatResolution, scoreColor } from '../../lib/format'
import { useHistory } from '../../lib/storage'
import { useApi } from '../../lib/useApi'

export default function SiteReport() {
  const { analysisId, siteId } = useParams()
  const all = useHistory()
  const analysis = all.find((a) => a.id === analysisId)
  const result = analysis?.results.find((r) => r.site.id === siteId)
  const catalog = useFeatureCatalog()
  const datasets = useApi('datasets', api.datasets)
  const layers = useApi('mapLayers', api.mapLayers)
  const tTerrain = useApi(analysis ? `terrain:${analysis.target.id}` : null, () => api.terrain(analysis!.target.id))
  const sTerrain = useApi(result ? `terrain:${result.site.id}` : null, () => api.terrain(result!.site.id))
  const axisMax = useMemo(() => (analysis ? computeAxisMax(analysis.results) : {}), [analysis])

  if (!analysis || !result) {
    return (
      <EmptyState className="mt-10" title="Report not available" action={<ButtonLink to="/app/results">Back to results</ButtonLink>}>
        This comparison is not stored in this browser. Reports are kept locally with the analysis that produced them.
      </EmptyState>
    )
  }

  const { site, explanation: ex } = result
  const t = analysis.target
  const dsById = Object.fromEntries((datasets.data ?? []).map((d) => [d.id, d]))
  const usedHere = Array.from(new Set(result.features.flatMap((f) => [f.target_dataset, f.candidate_dataset]).filter(Boolean))) as string[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/app/results/${analysis.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" /> All results for {t.name}
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer aria-hidden className="size-4" /> Print
          </Button>
          <SaveButton analysis={analysis} result={result} />
        </div>
      </div>

      {/* header */}
      <Panel className="overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <Planet body={analysis.body} size={64} spin={140} />
            <div className="min-w-0">
              <p className="eyebrow" style={{ color: BODY_COLOR[analysis.body] }}>{BODY_LABEL[analysis.body]} target</p>
              <h2 className="mt-1 text-[19px] font-semibold">{t.name}</h2>
              <p className="text-[12.5px] text-muted">{t.region_type} · <span className="num">{formatCoord(t.lat, t.lon)}</span></p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 border-y border-line px-8 py-5 lg:border-x lg:border-y-0">
            <ScoreDial score={result.score} size={112} stroke={7} />
            <p className="eyebrow">Rank #{result.rank} of {analysis.results.length}</p>
          </div>
          <div className="flex items-center gap-4 p-5 sm:p-6 lg:justify-end lg:text-right">
            <div className="min-w-0 lg:order-1">
              <p className="eyebrow text-earth">Earth candidate</p>
              <h1 className="mt-1 text-[19px] font-semibold">{site.name}</h1>
              <p className="text-[12.5px] text-muted">{site.country} · <span className="num">{formatCoord(site.lat, site.lon)}</span></p>
            </div>
            <Planet body="earth" size={64} spin={90} className="lg:order-2" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 sm:px-6">
          <Badge tone="accent">{analysis.mission.name}</Badge>
          <ConfidenceBadge confidence={result.confidence} coverage={result.coverage} />
          {analysis.data_mode === 'demo' && <DemoBadge label="Illustrative demo result" />}
        </div>
      </Panel>

      <p className="max-w-4xl text-[16px] leading-relaxed text-ink/90">
        <span className="font-medium text-ink">{ex.headline}</span> {ex.summary}
      </p>
      {result.scale_limited && (
        <p className="rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3 text-[13px] leading-relaxed text-warn/90">
          <span className="font-semibold text-warn">Regional-scale comparison.</span> Both sides were compared on a{' '}
          {Math.round(analysis.search.scale_profile.grid_m)} m grid over {analysis.search.scale_profile.window_m / 1000} km windows, so slopes describe broad
          landforms, not the ground a rover would drive on. Rover-scale Mars comparisons need finer data such as HiRISE DTMs.
        </p>
      )}
      {result.withheld && (
        <ErrorState className="items-start text-left" error={`Overall score withheld. ${result.withheld_reason ?? ''} Feature-level comparisons below are still valid for the features that could be measured.`} />
      )}

      {/* terrain images */}
      <Panel>
        <PanelHeader eyebrow="Terrain" title="Shaded relief from the elevation data" />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2" style={{ color: BODY_COLOR[analysis.body] }}>{t.name}</p>
            <TargetTerrain target={t} />
          </div>
          <div>
            <p className="eyebrow mb-2 text-earth">{site.name}</p>
            <PatchTerrain site={site} />
          </div>
        </div>
        <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-faint">
          Both images are rendered from the same DEMs the features were computed from (sun from the north-west). The target image shows
          surrounding context with the analysis window boxed; the Earth image is the analysis window itself.
        </p>
      </Panel>

      {/* why it matches */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel>
          <PanelHeader eyebrow="Explanation" title="Why this location matches" />
          <div className="flex flex-col gap-5 p-5">
            {ex.strengths.length ? (
              <ul className="flex flex-col gap-3">
                {ex.strengths.map((s) => (
                  <li key={s.feature_id} className="flex gap-3">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-good" />
                    <div>
                      <p className="text-[13.5px] text-ink">{featureName(catalog.byId, s.feature_id)} <span className="num text-[12px] text-good">s = {s.similarity?.toFixed(2)}</span></p>
                      <p className="num mt-0.5 text-[12px] text-muted">{s.text.split(': ').slice(1).join(': ')}</p>
                      <p className="mt-0.5 text-[12px] text-faint">{catalog.byId[s.feature_id]?.relevance}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-muted">No compared feature reaches a strong similarity (≥ 0.75). The location is a weak analog for this target and mission.</p>
            )}
            <CoverageExplainer coverage={result.coverage} lower={result.lower_bound} upper={result.upper_bound} score={result.score} />
            {result.ml && analysis.ml?.available && (
              <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3.5 text-[12.5px] leading-relaxed text-muted">
                <p className="eyebrow mb-1.5 flex items-center gap-1.5 text-accent"><BrainCircuit aria-hidden className="size-3.5" /> Machine-learning view</p>
                <p>
                  K-means places this window in{' '}
                  <span className="font-medium" style={{ color: clusterColor(result.ml.cluster) }}>{result.ml.cluster_label}</span>
                  {result.ml.same_cluster_as_target ? ', the same terrain cluster as the target.' : `, a different cluster from the target (${analysis.ml.clustering?.target_cluster_label}).`}
                </p>
                <p className="mt-1">
                  Nearest-neighbour search ranks it <span className="text-ink">#{result.ml.knn_rank}</span> of {analysis.search.patches_total} (distance{' '}
                  <span className="num">{result.ml.knn_distance?.toFixed(2)}</span>) versus <span className="text-ink">#{result.rank}</span> by weighted score.
                </p>
              </div>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Score anatomy" title="Contribution of each feature" />
          <div className="p-5">
            <ContributionBreakdown features={result.features} catalog={catalog.byId} />
            <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
              Track length = feature weight (maximum points). Fill = similarity × weight. Hatched = not compared, excluded rather than counted as a match.
            </p>
          </div>
        </Panel>
      </div>

      {/* visualisations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Fingerprint" title="Terrain feature comparison" action={analysis.data_mode === 'demo' ? <DemoBadge label="Demo" /> : undefined} />
          <div className="p-4">
            <FingerprintRadar features={result.features} axisMax={axisMax} catalog={catalog.byId} body={analysis.body} targetName={t.name} siteName={site.name} />
            <p className="px-1 text-[11.5px] text-faint">Each axis is scaled to the largest value of that feature in this analysis. Categorical features are omitted.</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Measurements" title="Side-by-side values" />
          <div className="p-5">
            <MeasurementTable features={result.features} catalog={catalog.byId} targetName={t.name} siteName={site.name} />
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          eyebrow="Terrain distributions"
          title="Slope distribution and elevation profile"
        />
        {tTerrain.error || sTerrain.error ? (
          <div className="p-5"><ErrorState error={(tTerrain.error ?? sTerrain.error)!} onRetry={() => { tTerrain.reload(); sTerrain.reload() }} /></div>
        ) : !tTerrain.data || !sTerrain.data ? (
          <LoadingBlock />
        ) : (
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <figure>
              <figcaption className="mb-2 text-[12.5px] text-muted">Share of area by slope class (%)</figcaption>
              <SlopeDistribution target={tTerrain.data} site={sTerrain.data} body={analysis.body} targetName={t.name} siteName={site.name} />
            </figure>
            <figure>
              <figcaption className="mb-2 text-[12.5px] text-muted">Elevation along a west–east transect through the window centre (m above its minimum)</figcaption>
              <ElevationProfile target={tTerrain.data} site={sTerrain.data} body={analysis.body} targetName={t.name} siteName={site.name} />
            </figure>
            <p className="text-[12px] leading-relaxed text-faint lg:col-span-2">
              Computed from the DEM pixels of each analysis window on the shared {Math.round(analysis.search.scale_profile.grid_m)} m grid.
            </p>
          </div>
        )}
      </Panel>

      {/* where it differs */}
      <Panel>
        <PanelHeader eyebrow="Limitations" title="Where it differs" />
        <div className="p-5">
          <WhereItDiffers
            differences={analysis.environmental_differences}
            terrainDiffs={ex.differences}
            unavailable={ex.unavailable}
            missionCaveat={analysis.mission.caveat}
            siteCaution={site.caution}
          />
        </div>
      </Panel>

      {/* context */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <PanelHeader eyebrow="Site context" title={site.name} />
          <div className="flex flex-col gap-4 p-5 text-[13.5px] leading-relaxed">
            <p className="text-muted">{site.description}</p>
            <div>
              <p className="eyebrow mb-2">Terrain characteristics</p>
              <div className="flex flex-wrap gap-1.5">{site.terrain.map((x) => <Badge key={x}>{x}</Badge>)}</div>
            </div>
            <div>
              <p className="eyebrow mb-2">Possible research applications</p>
              <div className="flex flex-wrap gap-1.5">{site.applications.map((x) => <Badge key={x} tone="accent">{x}</Badge>)}</div>
            </div>
            <p className="text-muted"><span className="text-ink">Potential comparison: </span>{site.potential_comparison}</p>
            <p className="text-muted"><span className="text-ink">Data quality: </span>{site.data_quality}</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Provenance" title="Datasets referenced" />
          <ul className="divide-y divide-line">
            {usedHere.map((id) => {
              const d = dsById[id]
              return (
                <li key={id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px]">{d?.name ?? id}</p>
                    <p className="text-[12px] text-muted">{d?.instrument}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="num text-[12px] text-muted">{formatResolution(d?.nominal_resolution_m)}</span>
                    {d && <Badge tone={d.status === 'connected' ? 'good' : 'neutral'}>{d.status === 'planned' ? 'Planned' : d.status === 'connected' ? 'Connected' : 'Imagery'}</Badge>}
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-faint">
            Every value in this report was computed by the Earth2Moon pipeline from the datasets listed above.
          </p>
        </Panel>
      </div>

      {/* split maps */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlanetMap body={analysis.body} points={[{ id: t.id, name: t.name, lat: t.lat, lon: t.lon }]} zoom={5} className="h-[320px]" />
        <EarthMap
          sites={[{ id: site.id, name: site.name, lat: site.lat, lon: site.lon, rank: result.rank, color: scoreColor(result.score) }]}
          heat={[{ id: site.id, bounds: site.bounds, score: result.score, rank: result.rank }]}
          overlays={(layers.data?.earth_tiles ?? []).map((x) => ({ image: x.image, bounds: x.bounds }))}
          selectedId={site.id}
          maxFitZoom={analysis.body === 'moon' ? 11 : 9}
          className="h-[320px]"
        />
      </div>

      <Disclaimer text={analysis.disclaimer} />
    </div>
  )
}
