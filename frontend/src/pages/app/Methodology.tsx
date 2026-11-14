import { ExternalLink, FileCode2 } from 'lucide-react'
import { Badge, DemoNotice, ErrorState, LoadingBlock, PageHeader, Panel, PanelHeader, Term } from '../../components/ui'
import { api } from '../../lib/api'
import { useFeatureCatalog, useMissions } from '../../lib/catalog'
import { formatResolution, pct } from '../../lib/format'
import type { Dataset } from '../../lib/types'
import { useApi } from '../../lib/useApi'

const PIPELINE = [
  { title: 'Ingest', text: 'Load planetary and Earth inputs, read metadata (instrument, resolution, acquisition, processing level).', status: 'Awaiting datasets' },
  { title: 'Harmonize', text: 'Reproject, align extents, convert units, mask missing values, resample to a common effective scale.', status: 'Awaiting datasets' },
  { title: 'Extract', text: 'Derive relief, slope, roughness, slope variability and crater metrics from DEMs; geology from maps.', status: 'Awaiting datasets' },
  { title: 'Compare', text: 'Per-feature similarity with resolution checks, mission weights, coverage and required-feature rules.', status: 'Implemented' },
  { title: 'Explain', text: 'Rank conservatively, report contributions, strengths, differences, gaps and environmental limits.', status: 'Implemented' },
]

const BODY_ORDER: Dataset['body'][] = ['moon', 'mars', 'earth']

export default function Methodology() {
  const datasets = useApi('datasets', api.datasets)
  const catalog = useFeatureCatalog()
  const missions = useMissions()
  const meta = useApi('meta', api.meta)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Data & Methodology"
        title="How Earth2Moon compares terrain"
        description="The planned data sources, the processing pipeline and the exact scoring rules. The comparison engine is implemented and tested; data ingestion will be built around the project datasets once they are provided."
      />
      <DemoNotice>
        <strong className="font-semibold text-warn">Integration status.</strong> No planetary or Earth dataset is processed yet. Measurements shown
        across the platform are synthetic placeholders, each tagged with the dataset it is planned to come from. Nominal resolutions below are
        published product specifications, to be confirmed against the provided files.
      </DemoNotice>

      {/* pipeline */}
      <Panel>
        <PanelHeader eyebrow="Pipeline" title="From raw data to an explained ranking" />
        <ol className="grid gap-px bg-line md:grid-cols-5">
          {PIPELINE.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 bg-surface p-5">
              <span className="num text-[12px] text-faint">0{i + 1}</span>
              <p className="font-display text-[16px] font-semibold">{s.title}</p>
              <p className="text-[12.5px] leading-relaxed text-muted">{s.text}</p>
              <span className="mt-auto pt-2">
                <Badge tone={s.status === 'Implemented' ? 'good' : 'warn'}>{s.status}</Badge>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      {/* datasets */}
      <Panel>
        <PanelHeader eyebrow="Data sources" title="Planned datasets" />
        {datasets.error ? (
          <div className="p-5"><ErrorState error={datasets.error} onRetry={datasets.reload} /></div>
        ) : !datasets.data ? (
          <LoadingBlock />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] tracking-wide text-faint uppercase">
                  {['Dataset', 'Instrument / product', 'Nominal resolution', 'Source', 'Status'].map((h) => (
                    <th key={h} scope="col" className="px-5 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              {BODY_ORDER.map((b) => (
                <tbody key={b}>
                  <tr>
                    <th colSpan={5} scope="colgroup" className="bg-base/60 px-5 py-2 text-left">
                      <Badge tone={b}>{b}</Badge>
                    </th>
                  </tr>
                  {(datasets.data ?? []).filter((d) => d.body === b).map((d) => (
                    <tr key={d.id} className="border-b border-line/60 align-top">
                      <td className="px-5 py-3">
                        <p className="font-medium">{d.name}</p>
                        {d.notes && <p className="mt-0.5 max-w-[260px] text-[11.5px] text-faint">{d.notes}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <p>{d.instrument}</p>
                        <p className="text-[12px] text-faint">{d.product}</p>
                      </td>
                      <td className="num px-5 py-3 text-muted">{formatResolution(d.nominal_resolution_m)}</td>
                      <td className="px-5 py-3">
                        <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                          {d.source} <ExternalLink aria-hidden className="size-3" />
                        </a>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={d.status === 'connected' ? 'good' : d.status === 'planned' ? 'warn' : 'accent'}>
                          {d.status === 'imagery_only' ? 'Imagery only' : d.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Panel>

      {/* features */}
      <Panel>
        <PanelHeader eyebrow="Terrain features" title="What is measured, and at what scale" />
        {!catalog.data ? (
          <LoadingBlock />
        ) : (
          <ul className="grid gap-px bg-line md:grid-cols-2">
            {catalog.data.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-[15.5px] font-semibold">{f.name}</p>
                  <span className="flex gap-1.5">
                    {f.unit && <Badge>{f.unit}</Badge>}
                    <Badge tone="accent">{f.kind === 'log_ratio' ? 'ratio kernel' : f.kind === 'numeric' ? 'gaussian kernel' : 'class match'}</Badge>
                  </span>
                </div>
                <p className="text-[13px] text-muted">{f.measured_as}</p>
                <p className="text-[12.5px] text-faint">Relevance: {f.relevance}</p>
                <dl className="num mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-muted">
                  {f.tolerance !== null && (
                    <div><dt className="inline text-faint">tolerance </dt><dd className="inline">{f.kind === 'log_ratio' ? `×${f.tolerance}` : `${f.tolerance} ${f.unit ?? ''}`}</dd></div>
                  )}
                  <div>
                    <dt className="inline text-faint">needs ≤ </dt>
                    <dd className="inline">{f.max_effective_resolution_m !== null ? formatResolution(f.max_effective_resolution_m) : 'map / sample data'}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* scoring */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <PanelHeader eyebrow="Scoring" title="Similarity model and rules" />
          <div className="flex flex-col gap-5 p-5 text-[13.5px] leading-relaxed text-muted">
            <p className="font-display text-[24px] text-ink">S = 100 × Σ (wᵢ × sᵢ)</p>
            <p>
              <span className="text-ink">sᵢ</span>: similarity for feature i, between 0 and 1. Numeric features use a Gaussian kernel on the
              difference, <span className="num text-ink">exp(−½(Δ/τ)²)</span>; scale quantities such as relief use the same kernel on the log ratio, so
              60 m vs 120 m counts the same as 600 m vs 1200 m; geological classes score 1 (same class), 0.6 (same family) or 0.
            </p>
            <p><span className="text-ink">wᵢ</span>: mission weight, normalized over the selected features so Σwᵢ = 1. Features outside the mission profile start at 10% before normalization.</p>
            <ol className="flex flex-col gap-2.5 border-l border-line-strong pl-4">
              <li><span className="text-ink">Resolution rule.</span> The <Term term="effective resolution">effective resolution</Term> is the coarser input. If it exceeds what the feature needs, the feature is reported as too coarse and not scored.</li>
              <li><span className="text-ink">No silent matches.</span> Missing features are excluded and reported. <Term term="coverage">Coverage</Term> is the weight of the features actually compared.</li>
              <li><span className="text-ink">Withholding.</span> The score is withheld below {meta.data ? pct(meta.data.min_coverage) : '60%'} coverage, or when a mission-required feature (e.g. craters for crater navigation) cannot be compared.</li>
              <li><span className="text-ink">Conservative ranking.</span> Sites are ranked by the <Term term="lower bound">lower bound</Term>, so a data gap can never move a site up. The re-normalized score and its possible range are reported alongside.</li>
              <li><span className="text-ink">Explanations</span> are assembled from computed values by templates. No language model writes or invents numbers.</li>
            </ol>
            <p className="text-[12.5px] text-faint">Kernels, tolerances and weights are prototype choices to be calibrated with sensitivity and ablation testing once real data are available.</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Mission profiles" title="Default weights" />
          {!missions.data ? (
            <LoadingBlock />
          ) : (
            <ul className="divide-y divide-line">
              {missions.data.map((m) => (
                <li key={m.id} className="px-5 py-4">
                  <p className="text-[14px] font-medium">{m.name}</p>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {Object.entries(m.weights).sort((a, b) => b[1] - a[1]).map(([fid, w]) => (
                      <li key={fid} className="grid grid-cols-[150px_1fr_40px] items-center gap-3 text-[12px]">
                        <span className="truncate text-muted">
                          {catalog.byId[fid]?.name ?? fid}
                          {m.required.includes(fid) && <span className="ml-1.5 font-mono text-[9.5px] text-accent uppercase">req</span>}
                        </span>
                        <span className="h-1.5 rounded-full bg-raised"><span className="block h-full rounded-full bg-accent/70" style={{ width: `${w * 100}%` }} /></span>
                        <span className="num text-right text-muted">{pct(w)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* integration */}
      <Panel>
        <PanelHeader eyebrow="Integration" title="Where the project datasets connect" />
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed text-muted">
            <p>
              Every page reads data through one backend interface, the <span className="num text-ink">DataProvider</span>. The interface does not assume any
              file format, projection or variable name. Once the datasets are provided, a new provider will translate them into per-feature
              measurements, and the website, engine and reports keep working unchanged.
            </p>
            <p>Switching providers is a configuration change: <span className="num text-ink">EARTH2MOON_DATA_PROVIDER</span>.</p>
            <p>Validation will then follow the proposal: reference-case, feature, resolution, sensitivity and ablation testing, plus expert review.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-line bg-void p-4 font-mono text-[12px] leading-relaxed text-muted">
            <span className="flex items-center gap-2 pb-2 text-faint"><FileCode2 aria-hidden className="size-3.5" /> backend/app/providers/base.py</span>
{`class DataProvider(Protocol):
    def list_targets(self, body) -> list[TargetRegion]
    def list_candidates(self) -> list[CandidateSite]
    def get_terrain_summary(self, id) -> TerrainSummary
    def list_datasets(self) -> list[Dataset]

# TargetRegion / CandidateSite carry
#   measurements: {feature_id: Measurement(
#       value, resolution_m, dataset_id, provenance)}`}
          </pre>
        </div>
      </Panel>
    </div>
  )
}
