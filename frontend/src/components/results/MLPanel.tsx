import clsx from 'clsx'
import { BrainCircuit, GitCompareArrows, Network } from 'lucide-react'
import type { FeatureSpec, MLCrossCheck } from '../../lib/types'
import { Badge, Panel, PanelHeader } from '../ui'

/** Cluster colours, ordered like the clusters (gentle -> steep). Distinct from score colours. */
export const CLUSTER_COLORS = ['#70B8FF', '#E6C26E', '#D98655', '#C9D2DF', '#8C9EFF', '#6FD4A8', '#E5807A', '#9BAABC']
export const clusterColor = (id: number | null | undefined) => (id === null || id === undefined ? '#6F7F93' : CLUSTER_COLORS[id % CLUSTER_COLORS.length])

function agreementText(overlap: number, n: number, rho: number | null) {
  if (rho === null) return 'Agreement could not be computed.'
  const strength = rho >= 0.8 ? 'strongly' : rho >= 0.5 ? 'moderately' : 'weakly'
  return `The two methods ${strength} agree: ${overlap} of the top ${n} windows are the same, and the full rankings correlate at ρ = ${rho.toFixed(2)}.`
}

export function ClusterLegend({ ml, className }: { ml: MLCrossCheck; className?: string }) {
  const c = ml.clustering
  if (!c) return null
  return (
    <ul className={clsx('flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted', className)}>
      {c.clusters.map((k) => (
        <li key={k.id} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: clusterColor(k.id) }} />
          {k.label}
          {k.id === c.target_cluster && <span className="font-medium text-ink">· target</span>}
        </li>
      ))}
    </ul>
  )
}

export function MLPanel({ ml, catalog, onSelect }: { ml: MLCrossCheck | undefined; catalog: Record<string, FeatureSpec>; onSelect?: (id: string) => void }) {
  if (!ml) return null
  if (!ml.available) {
    return (
      <Panel>
        <PanelHeader eyebrow="Machine learning" title="Machine-learning cross-check" />
        <p className="p-5 text-[13px] text-muted">{ml.reason}</p>
      </Panel>
    )
  }
  const c = ml.clustering!
  const knn = ml.knn!
  const ag = ml.agreement!
  const maxSil = Math.max(...Object.values(c.silhouette_by_k))
  return (
    <Panel>
      <PanelHeader
        eyebrow="Machine learning"
        title="Machine-learning cross-check"
        action={<Badge tone="accent"><BrainCircuit aria-hidden className="size-3" /> Unsupervised · no training labels</Badge>}
      />
      <div className="grid gap-px bg-line lg:grid-cols-3">
        {/* K-means */}
        <section className="flex flex-col gap-3 bg-surface p-5">
          <p className="eyebrow flex items-center gap-1.5"><Network aria-hidden className="size-3.5" /> K-means terrain clusters</p>
          <p className="text-[13px] leading-relaxed text-muted">
            The target falls in cluster{' '}
            <span className="font-medium" style={{ color: clusterColor(c.target_cluster) }}>{c.target_cluster_label}</span>, shared by{' '}
            <span className="text-ink">{c.earth_windows_in_target_cluster}</span> Earth windows.
          </p>
          <ul className="flex flex-col gap-1.5">
            {c.clusters.map((k) => (
              <li key={k.id} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[12px]">
                <span className="size-2.5 rounded-sm" style={{ background: clusterColor(k.id) }} />
                <span className={clsx('truncate', k.id === c.target_cluster ? 'text-ink' : 'text-muted')}>{k.label}</span>
                <span className="num text-faint">{k.earth_windows} on Earth</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <p className="mb-1.5 text-[11px] text-faint">Silhouette score by k (higher = clearer clusters); k = {c.k} chosen</p>
            <div className="flex h-12 items-end gap-1" role="img" aria-label={`Silhouette scores; best k is ${c.k} with ${c.silhouette}`}>
              {Object.entries(c.silhouette_by_k).map(([k, v]) => (
                <div key={k} className="flex flex-1 flex-col items-center gap-0.5">
                  <div className={clsx('w-full rounded-sm', Number(k) === c.k ? 'bg-accent' : 'bg-raised')} style={{ height: `${(v / maxSil) * 36}px` }} title={`k=${k}: ${v}`} />
                  <span className="num text-[9.5px] text-faint">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* kNN */}
        <section className="flex flex-col gap-3 bg-surface p-5">
          <p className="eyebrow flex items-center gap-1.5"><BrainCircuit aria-hidden className="size-3.5" /> Nearest-neighbour search</p>
          <p className="text-[13px] leading-relaxed text-muted">
            Closest Earth windows in standardized feature space ({(ml.features_used ?? []).map((f) => catalog[f]?.short_name ?? f).join(', ')}), all features weighted equally.
          </p>
          <ol className="flex flex-col divide-y divide-line">
            {knn.top.slice(0, 5).map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onSelect?.(x.id)} className="grid w-full cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-2 py-1.5 text-left text-[12.5px] hover:text-accent">
                  <span className="num text-faint">{x.knn_rank}</span>
                  <span className="truncate">{x.name}</span>
                  <span className="num text-[11px] text-faint">d {x.distance.toFixed(2)} · score #{x.score_rank}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* agreement */}
        <section className="flex flex-col gap-3 bg-surface p-5">
          <p className="eyebrow flex items-center gap-1.5"><GitCompareArrows aria-hidden className="size-3.5" /> Do the methods agree?</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line px-3 py-2.5">
              <p className="font-display text-[24px] font-semibold">{ag.top_overlap}<span className="text-[14px] text-faint">/{ag.top_n}</span></p>
              <p className="text-[11px] text-muted">same windows in both top {ag.top_n}</p>
            </div>
            <div className="rounded-lg border border-line px-3 py-2.5">
              <p className="font-display text-[24px] font-semibold">{ag.spearman === null ? '—' : ag.spearman.toFixed(2)}</p>
              <p className="text-[11px] text-muted">Spearman ρ, full ranking</p>
            </div>
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted">{agreementText(ag.top_overlap, ag.top_n, ag.spearman)}</p>
          <p className="mt-auto text-[11.5px] leading-relaxed text-faint">
            The weighted score uses mission weights; the nearest-neighbour search does not. Agreement suggests the ranking is not an artefact of the
            chosen weights. Neither method has been validated against labelled analog sites.
          </p>
        </section>
      </div>
    </Panel>
  )
}
