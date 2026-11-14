import { AlertTriangle, Languages, RefreshCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button, ButtonLink } from '../components/ui'

/** Friendly replacement for React Router's default developer error screen. */
export default function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error)

  return (
    <div className="flex min-h-[70dvh] items-center justify-center bg-void px-4 py-16">
      <div className="panel w-full max-w-lg p-7 text-center">
        <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-bad/10 text-bad">
          <AlertTriangle aria-hidden className="size-5" />
        </div>
        <h1 className="text-[22px] font-semibold">{notFound ? 'Page not found' : 'Something went wrong on this page'}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {notFound ? 'This page does not exist.' : 'Your analyses and saved sites are safe. Reloading the page usually fixes this.'}
        </p>
        {!notFound && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-base/60 px-3 py-2.5 text-left text-[12.5px] leading-relaxed text-muted">
            <Languages aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            If your browser is translating this page automatically, turning translation off for this site can prevent the problem.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden className="size-4" /> Try again
          </Button>
          <ButtonLink to="/app" variant="secondary">Go to Overview</ButtonLink>
        </div>
        {!notFound && <p className="num mt-6 break-words text-[11px] text-faint">{message}</p>}
      </div>
    </div>
  )
}
