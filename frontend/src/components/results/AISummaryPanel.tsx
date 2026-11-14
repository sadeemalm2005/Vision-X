import { CheckCircle2, Info, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'
import { history } from '../../lib/storage'
import type { AnalysisResult, SiteResult } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { Badge, Button, ErrorState, Spinner } from '../ui'

const PROVIDER_LABEL: Record<string, string> = { anthropic: 'Claude', openai: 'OpenAI', gemini: 'Gemini' }

/**
 * AI-written summary (proposal §8.5). Generated on request (each call can cost
 * money), written only from server-recomputed numbers, and rejected by the API
 * if it contains any number that is not in the data.
 */
export function AISummaryPanel({ analysis, result }: { analysis: AnalysisResult; result: SiteResult }) {
  const status = useApi('aiStatus', api.aiStatus)
  const saved = analysis.ai_summaries?.[result.site.id]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const s = await api.aiSummary({
        body: analysis.body,
        target_id: analysis.target.id,
        mission_id: analysis.mission.id,
        features: analysis.weights.map((w) => w.feature_id),
        weights: Object.fromEntries(analysis.weights.map((w) => [w.feature_id, w.weight * 100])),
        site_id: result.site.id,
      })
      history.update(analysis.id, (a) => ({ ...a, ai_summaries: { ...a.ai_summaries, [result.site.id]: s } }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const label = saved ? (PROVIDER_LABEL[saved.provider] ?? saved.provider) : null

  return (
    <section aria-labelledby="ai-summary-title" className="rounded-[var(--radius-card)] border border-accent-2/30 bg-accent-2/[0.05] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-summary-title" className="flex items-center gap-2 text-[15px] font-semibold">
          <Sparkles aria-hidden className="size-4 text-accent-2" /> AI summary
        </h2>
        {saved && (
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="accent">AI-written · {label} · {saved.model}</Badge>
            <Badge tone="good"><CheckCircle2 aria-hidden className="size-3" /> Numbers verified</Badge>
          </div>
        )}
      </div>

      {saved ? (
        <>
          <p className="text-[15px] leading-relaxed text-ink/90">{saved.summary}</p>
          <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
            Written by a language model from this report&apos;s computed values. Every number was checked against the data before display; the
            tables below remain the authoritative source.
          </p>
        </>
      ) : status.loading ? (
        <p className="flex items-center gap-2 text-[13px] text-muted"><Spinner /> Checking AI availability…</p>
      ) : status.data?.enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={loading}>
            {loading ? <><Spinner /> Writing summary…</> : <><Sparkles aria-hidden className="size-4" /> Generate AI summary</>}
          </Button>
          <p className="text-[12.5px] text-muted">
            Uses {PROVIDER_LABEL[status.data.provider ?? ''] ?? status.data.provider} ({status.data.model}). The text is built only from the numbers in this report.
          </p>
        </div>
      ) : (
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
          AI summaries are switched off on this server. {status.data?.reason ?? status.error?.message}
        </p>
      )}
      {error && <ErrorState className="mt-4 py-5" error={error} onRetry={generate} />}
    </section>
  )
}
