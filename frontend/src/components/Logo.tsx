import clsx from 'clsx'
import { Link } from 'react-router-dom'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={clsx('size-7', className)}>
      <circle cx="13" cy="17" r="11" fill="none" stroke="#70B8FF" strokeOpacity=".4" strokeWidth="1" />
      <circle cx="13" cy="17" r="6.5" fill="#4C9FD8" />
      <path d="M8.5 15.5c2-1.6 4.4-1.1 6 .4 1.2 1.1 2.9 1.2 4-.2" fill="none" stroke="#07111F" strokeOpacity=".35" strokeWidth="1.2" />
      <circle cx="24.5" cy="8.5" r="3" fill="#C9D2DF" />
    </svg>
  )
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={clsx('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="Earth2Moon home">
      <LogoMark />
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
        Earth<span className="text-accent">2</span>Moon
      </span>
    </Link>
  )
}
