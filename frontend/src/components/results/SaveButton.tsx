import { Bookmark, BookmarkCheck } from 'lucide-react'
import { saved, useSaved } from '../../lib/storage'
import type { AnalysisResult, SiteResult } from '../../lib/types'
import { BODY_LABEL } from '../../lib/format'
import { Button } from '../ui'

export function SaveButton({ analysis, result, size = 'sm', compact = false }: { analysis: AnalysisResult; result: SiteResult; size?: 'sm' | 'md'; compact?: boolean }) {
  useSaved() // re-render on change
  const isSaved = saved.has(result.site.id, analysis.id)
  const toggle = () =>
    saved.toggle({
      siteId: result.site.id,
      siteName: result.site.name,
      country: result.site.country,
      analysisId: analysis.id,
      context: `${BODY_LABEL[analysis.body]} · ${analysis.target.name} · ${analysis.mission.name}`,
      score: result.score,
    })
  return (
    <Button variant={isSaved ? 'secondary' : 'ghost'} size={size} onClick={toggle} aria-pressed={isSaved} aria-label={isSaved ? `Remove ${result.site.name} from saved` : `Save ${result.site.name}`}>
      {isSaved ? <BookmarkCheck aria-hidden className="size-4 text-accent" /> : <Bookmark aria-hidden className="size-4" />}
      {!compact && (isSaved ? 'Saved' : 'Save')}
    </Button>
  )
}
