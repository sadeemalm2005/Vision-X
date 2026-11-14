import clsx from 'clsx'
import { CircleSlash, Scale, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CONFIDENCE_LABEL, pct, scoreColor } from '../../lib/format'
import type { Confidence, EnvironmentalDifference } from '../../lib/types'
import { Badge, Term } from '../ui'

export function ScoreDial({ score, size = 96, stroke = 6, className }: { score: number | null; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = scoreColor(score)
  const frac = score === null ? 0 : score / 100
  return (
    <div className={clsx('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(155,170,188,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display leading-none font-semibold" style={{ fontSize: size * 0.3, color: score === null ? '#6F7F93' : undefined }}>
          {score === null ? '—' : score.toFixed(0)}
        </span>
        <span className="num mt-1 text-[10px] text-faint">{score === null ? 'withheld' : '/ 100'}</span>
      </div>
    </div>
  )
}

export function ConfidenceBadge({ confidence, coverage }: { confidence: Confidence; coverage: number }) {
  const tone = confidence === 'high' ? 'good' : confidence === 'medium' ? 'warn' : 'bad'
  return (
    <Badge tone={tone}>
      {CONFIDENCE_LABEL[confidence]} · {pct(coverage)} data
    </Badge>
  )
}

export function Disclaimer({ text, className }: { text: string; className?: string }) {
  return (
    <div role="note" className={clsx('flex gap-3 rounded-xl border border-line-strong bg-base/70 px-4 py-3.5', className)}>
      <Scale aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="text-[13px] leading-relaxed text-muted">
        <span className="font-medium text-ink">Similarity is not equivalence. </span>
        {text}
      </p>
    </div>
  )
}

export function WhereItDiffers({
  differences,
  terrainDiffs,
  unavailable,
  missionCaveat,
  siteCaution,
}: {
  differences: EnvironmentalDifference[]
  terrainDiffs: { text: string }[]
  unavailable: { text: string }[]
  missionCaveat: string
  siteCaution: string
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <div>
          <h4 className="eyebrow mb-2.5">Terrain features that differ</h4>
          {terrainDiffs.length ? (
            <ul className="flex flex-col gap-2 text-[13.5px] text-ink/90">
              {terrainDiffs.map((d) => (
                <li key={d.text} className="flex gap-2.5">
                  <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-bad" />
                  <span className="num text-[12.5px] leading-relaxed">{d.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No compared feature has a similarity below 0.50.</p>
          )}
        </div>
        <div>
          <h4 className="eyebrow mb-2.5">Not compared</h4>
          {unavailable.length ? (
            <ul className="flex flex-col gap-2 text-[13px] text-muted">
              {unavailable.map((d) => (
                <li key={d.text} className="flex gap-2.5">
                  <CircleSlash aria-hidden className="mt-0.5 size-3.5 shrink-0 text-faint" />
                  <span className="leading-relaxed">{d.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">All selected features were compared.</p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-base/60 p-3.5 text-[13px] leading-relaxed text-muted">
          <p><span className="text-ink">Site caution: </span>{siteCaution}</p>
          <p className="mt-2"><span className="text-ink">Mission caveat: </span>{missionCaveat}</p>
        </div>
      </div>
      <div>
        <h4 className="eyebrow mb-2.5 flex items-center gap-2">
          <ShieldAlert aria-hidden className="size-3.5" /> What Earth cannot reproduce
        </h4>
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {differences.map((d) => (
            <li key={d.factor} className="px-4 py-3">
              <p className="text-[13px] font-medium text-ink">{d.factor}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{d.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function CoverageExplainer({ coverage, lower, upper, score }: { coverage: number; lower: number; upper: number; score: number | null }) {
  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
      <div className="bg-surface px-3 py-3">
        <dt className="eyebrow"><Term term="coverage">Coverage</Term></dt>
        <dd className="num mt-1 text-[17px]">{pct(coverage)}</dd>
      </div>
      <div className="bg-surface px-3 py-3">
        <dt className="eyebrow"><Term term="lower bound">Lower</Term></dt>
        <dd className="num mt-1 text-[17px]">{lower.toFixed(0)}</dd>
      </div>
      <div className="bg-surface px-3 py-3">
        <dt className="eyebrow">Upper</dt>
        <dd className="num mt-1 text-[17px]">{score === null && upper === lower ? '—' : upper.toFixed(0)}</dd>
      </div>
    </dl>
  )
}

export function ReportLink({ analysisId, siteId, children, className }: { analysisId: string; siteId: string; children: React.ReactNode; className?: string }) {
  return (
    <Link to={`/app/results/${analysisId}/site/${siteId}`} className={className}>
      {children}
    </Link>
  )
}
