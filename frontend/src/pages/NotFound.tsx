import { Planet } from '../components/Planet'
import { ButtonLink } from '../components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-4 text-center">
      <Planet body="moon" size={120} spin={160} />
      <div>
        <p className="eyebrow mb-2">404</p>
        <h1 className="text-[28px] font-semibold">This region is uncharted</h1>
        <p className="mt-2 text-muted">The page you are looking for does not exist.</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink to="/" variant="secondary">Home</ButtonLink>
        <ButtonLink to="/app">Open platform</ButtonLink>
      </div>
    </div>
  )
}
