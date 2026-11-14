import { Bookmark, Clock, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ScoreDial } from '../../components/results/ResultParts'
import { Button, ButtonLink, EmptyState, PageHeader, Panel, PanelHeader } from '../../components/ui'
import { BODY_COLOR, BODY_LABEL, formatDate } from '../../lib/format'
import { history, saved, useHistory, useSaved } from '../../lib/storage'

export default function Saved() {
  const savedList = useSaved()
  const all = useHistory()
  const [confirmClear, setConfirmClear] = useState(false)
  const analysisExists = (id: string | null) => !!id && all.some((a) => a.id === id)

  return (
    <div>
      <PageHeader
        eyebrow="Saved"
        title="Saved locations & history"
        description="Bookmarked sites and previous analysis sessions. Stored only in this browser: there are no accounts in this prototype, nothing is synced, and clearing site data removes it."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow={`${savedList.length} saved`} title="Saved locations" />
          {savedList.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<Bookmark className="size-5" />} title="No saved locations" action={<ButtonLink to="/app/results" variant="secondary">Go to results</ButtonLink>}>
                Use the Save button on any result or report to keep it here with its analysis context.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {savedList.map((s) => {
                const linked = analysisExists(s.analysisId)
                return (
                  <li key={`${s.siteId}-${s.analysisId}`} className="flex items-center gap-4 px-5 py-4">
                    <ScoreDial score={s.score} size={48} stroke={3.5} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium">{s.siteName}</p>
                      <p className="truncate text-[12.5px] text-muted">{s.context ?? s.country}</p>
                      <p className="num mt-0.5 text-[11px] text-faint">saved {formatDate(s.savedAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {linked ? (
                        <ButtonLink to={`/app/results/${s.analysisId}/site/${s.siteId}`} variant="secondary" size="sm" aria-label={`Open report for ${s.siteName}`}>
                          <FileText aria-hidden className="size-3.5" /> <span className="hidden sm:inline">Report</span>
                        </ButtonLink>
                      ) : (
                        <span className="self-center px-2 text-[11.5px] text-faint">analysis removed</span>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => saved.remove(s.siteId, s.analysisId)} aria-label={`Remove ${s.siteName}`}>
                        <Trash2 aria-hidden className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow={`${all.length} sessions`}
            title="Analysis history"
            action={
              all.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted">Delete all?</span>
                  <Button size="sm" variant="secondary" onClick={() => { history.clear(); setConfirmClear(false) }}>Yes, clear</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>Clear history</Button>
              ))
            }
          />
          {all.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<Clock className="size-5" />} title="No analyses yet" action={<ButtonLink to="/app/explore">Start an analysis</ButtonLink>}>
                Every analysis you run is kept here (latest 25) so you can reopen its results.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {all.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: BODY_COLOR[a.body] }} aria-label={BODY_LABEL[a.body]} />
                  <Link to={`/app/results/${a.id}`} className="min-w-0 flex-1 rounded-md hover:text-accent">
                    <p className="truncate text-[14px]">{a.target.name} <span className="text-faint">·</span> {a.mission.name}</p>
                    <p className="truncate text-[12px] text-muted">
                      {a.weights.length} features · top: {a.results[0]?.site.name} {a.results[0]?.score !== null ? `(${a.results[0]?.score?.toFixed(0)})` : ''}
                    </p>
                    <p className="num text-[11px] text-faint">{formatDate(a.created_at)}</p>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => history.remove(a.id)} aria-label={`Delete analysis of ${a.target.name}`}>
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
