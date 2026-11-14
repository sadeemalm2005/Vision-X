import clsx from 'clsx'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { featureName } from '../../lib/catalog'
import { BODY_COLOR, formatValue, pct, scoreColor, simTone, STATUS_LABEL, TONE_COLOR } from '../../lib/format'
import type { Body, FeatureResult, FeatureSpec, SiteResult, TerrainSummary } from '../../lib/types'

const AXIS = { stroke: '#6F7F93', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }
const GRID = 'rgba(155,170,188,0.12)'

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line-strong bg-raised px-3 py-2 text-xs shadow-xl shadow-black/40">
      {label !== undefined && <p className="mb-1 font-mono text-muted">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="num ml-auto pl-3 text-ink">
            {typeof p.value === 'number' ? p.value.toFixed(p.value < 1 ? 3 : 1) : p.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </p>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------- fingerprint */

/**
 * Terrain fingerprint radar: numeric feature values for target and site,
 * each axis scaled to the largest value of that feature in the analysis.
 */
export function FingerprintRadar({
  features,
  axisMax,
  catalog,
  body,
  siteName,
  targetName,
}: {
  features: FeatureResult[]
  axisMax: Record<string, number>
  catalog: Record<string, FeatureSpec>
  body: Body
  siteName: string
  targetName: string
}) {
  const rows = features
    .filter((f) => catalog[f.feature_id]?.kind !== 'categorical')
    .map((f) => {
      const max = axisMax[f.feature_id] || 1
      const t = typeof f.target_value === 'number' ? f.target_value / max : null
      const s = typeof f.candidate_value === 'number' ? f.candidate_value / max : null
      return { axis: featureName(catalog, f.feature_id, true), target: t ?? 0, site: s ?? 0, missing: t === null || s === null }
    })
  if (rows.length < 3) {
    return <p className="py-10 text-center text-sm text-muted">A fingerprint needs at least three numeric features with data.</p>
  }
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#9BAABC', fontSize: 11, fontFamily: 'Inter' }} />
          <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
          <Radar name={targetName} dataKey="target" stroke={BODY_COLOR[body]} fill={BODY_COLOR[body]} fillOpacity={0.18} strokeWidth={1.5} isAnimationActive={false} />
          <Radar name={siteName} dataKey="site" stroke={BODY_COLOR.earth} fill={BODY_COLOR.earth} fillOpacity={0.22} strokeWidth={1.5} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9BAABC' }} iconType="circle" iconSize={8} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Axis maxima across the target and all sites of an analysis. */
export function computeAxisMax(results: SiteResult[]): Record<string, number> {
  const max: Record<string, number> = {}
  for (const r of results) {
    for (const f of r.features) {
      for (const v of [f.target_value, f.candidate_value]) {
        if (typeof v === 'number') max[f.feature_id] = Math.max(max[f.feature_id] ?? 0, v)
      }
    }
  }
  return max
}

/* ------------------------------------------------- contribution breakdown */

/**
 * For each feature: the track is its maximum possible points (weight × 100),
 * the fill is what it actually contributed (weight × similarity × 100).
 */
export function ContributionBreakdown({ features, catalog }: { features: FeatureResult[]; catalog: Record<string, FeatureSpec> }) {
  const sorted = [...features].sort((a, b) => b.weight - a.weight)
  const maxW = Math.max(...sorted.map((f) => f.weight), 0.01)
  return (
    <ul className="flex flex-col gap-3.5">
      {sorted.map((f) => {
        const tone = simTone(f.similarity)
        return (
          <li key={f.feature_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[13px] text-ink">{featureName(catalog, f.feature_id)}</span>
              <span className="num shrink-0 text-[11px] text-faint">w {pct(f.weight)}</span>
            </div>
            <span className="num text-right text-[13px]" style={{ color: TONE_COLOR[tone] }}>
              {f.contribution !== null ? `${f.contribution.toFixed(1)} pts` : STATUS_LABEL[f.status]}
            </span>
            <div className="col-span-2 h-2 rounded-full bg-raised/60">
              <div className="relative h-full rounded-full border border-line-strong/70" style={{ width: `${(f.weight / maxW) * 100}%` }}>
                {f.similarity !== null ? (
                  <div className="h-full rounded-full" style={{ width: `${f.similarity * 100}%`, background: TONE_COLOR[tone] }} />
                ) : (
                  <div className="h-full rounded-full bg-[repeating-linear-gradient(135deg,rgba(155,170,188,.18)_0_4px,transparent_4px_8px)]" />
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------- ranking ranges */

/**
 * Ranking chart with uncertainty: bar spans the lower/upper bound implied by
 * missing features, dot marks the reported score.
 */
export function RankingRanges({
  results,
  selectedId,
  onSelect,
}: {
  results: SiteResult[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-[minmax(110px,170px)_1fr_48px] gap-3 text-[10.5px]">
        <span />
        <div className="num flex justify-between text-faint">
          {[0, 25, 50, 75, 100].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <span />
      </div>
      <ul className="flex flex-col gap-1">
        {results.map((r) => {
          const color = scoreColor(r.score)
          const sel = r.site.id === selectedId
          return (
            <li key={r.site.id}>
              <button
                type="button"
                onClick={() => onSelect?.(r.site.id)}
                aria-pressed={sel}
                className={clsx(
                  'grid w-full cursor-pointer grid-cols-[minmax(110px,170px)_1fr_48px] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                  sel ? 'bg-raised' : 'hover:bg-raised/50',
                )}
              >
                <span className="flex min-w-0 items-center gap-2 text-[13px]">
                  <span className="num w-4 shrink-0 text-faint">{r.rank}</span>
                  <span className="truncate">{r.site.name}</span>
                </span>
                <span className="relative h-5">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
                  {[25, 50, 75].map((t) => (
                    <span key={t} className="absolute top-1 bottom-1 w-px bg-line" style={{ left: `${t}%` }} />
                  ))}
                  <span
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                    style={{ left: `${r.lower_bound}%`, width: `${Math.max(r.upper_bound - r.lower_bound, 0.8)}%`, background: color, opacity: 0.28 }}
                  />
                  <span className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded bg-muted" style={{ left: `${r.lower_bound}%` }} title="Lower bound" />
                  {r.score !== null && (
                    <span
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                      style={{ left: `${r.score}%`, background: color }}
                    />
                  )}
                </span>
                <span className="num text-right text-[13px]" style={{ color }}>
                  {r.score !== null ? r.score.toFixed(0) : '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-good" /> Score</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-good/30" /> Possible range if missing features were measured</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-[2px] rounded bg-muted" /> Lower bound (ranking key)</span>
        <span className="flex items-center gap-1.5"><span className="num">—</span> Score withheld</span>
      </div>
    </div>
  )
}

/* ----------------------------------------------- terrain distributions */

export function SlopeDistribution({ target, site, body, targetName, siteName }: { target: TerrainSummary; site: TerrainSummary; body: Body; targetName: string; siteName: string }) {
  const edges = target.slope_histogram.bin_edges
  const data = target.slope_histogram.counts.map((c, i) => ({
    bin: `${edges[i]}–${edges[i + 1]}°`,
    [targetName]: c * 100,
    [siteName]: (site.slope_histogram.counts[i] ?? 0) * 100,
  }))
  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="bin" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" width={44} />
          <Tooltip content={<ChartTooltip unit="% area" />} />
          <Area type="monotone" dataKey={targetName} stroke={BODY_COLOR[body]} fill={BODY_COLOR[body]} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
          <Area type="monotone" dataKey={siteName} stroke={BODY_COLOR.earth} fill={BODY_COLOR.earth} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ElevationProfile({ target, site, body, targetName, siteName }: { target: TerrainSummary; site: TerrainSummary; body: Body; targetName: string; siteName: string }) {
  const data = target.profile_distance_m.map((d, i) => ({
    km: (d / 1000).toFixed(1),
    [targetName]: target.profile_elevation_m[i],
    [siteName]: site.profile_elevation_m[i],
  }))
  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="km" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={15} unit=" km" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit=" m" width={56} />
          <Tooltip content={<ChartTooltip unit="m" />} />
          <Line type="monotone" dataKey={targetName} stroke={BODY_COLOR[body]} dot={false} strokeWidth={1.75} isAnimationActive={false} />
          <Line type="monotone" dataKey={siteName} stroke={BODY_COLOR.earth} dot={false} strokeWidth={1.75} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------- measurement table */

export function MeasurementTable({ features, catalog, targetName, siteName }: { features: FeatureResult[]; catalog: Record<string, FeatureSpec>; targetName: string; siteName: string }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[480px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line align-bottom text-[11px] tracking-wide text-faint uppercase">
            <th scope="col" className="py-2 pr-3 font-medium">Feature</th>
            <th scope="col" className="py-2 pr-3 font-medium">{targetName}</th>
            <th scope="col" className="py-2 pr-3 font-medium">{siteName}</th>
            <th scope="col" className="py-2 pr-3 font-medium">Eff. res.</th>
            <th scope="col" className="py-2 text-right font-medium">Sim.</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => {
            const spec = catalog[f.feature_id]
            const tone = simTone(f.similarity)
            return (
              <tr key={f.feature_id} className="border-b border-line/60 last:border-0">
                <th scope="row" className="py-2.5 pr-3 font-normal text-ink">{spec?.name ?? f.feature_id}</th>
                <td className="num py-2.5 pr-3 text-muted">{formatValue(f.target_value, spec)}</td>
                <td className="num py-2.5 pr-3 text-muted">{formatValue(f.candidate_value, spec)}</td>
                <td className="num py-2.5 pr-3 text-muted">{f.effective_resolution_m !== null ? `${f.effective_resolution_m} m` : '—'}</td>
                <td className="num py-2.5 text-right" style={{ color: TONE_COLOR[tone] }}>
                  {f.similarity !== null ? f.similarity.toFixed(2) : <span className="font-sans text-xs text-faint">{STATUS_LABEL[f.status]}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
