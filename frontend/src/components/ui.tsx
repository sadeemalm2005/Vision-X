import clsx from 'clsx'
import { AlertTriangle, FlaskConical, Info, Loader2, RefreshCw } from 'lucide-react'
import { useId, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { GLOSSARY } from '../lib/glossary'

/* ----------------------------------------------------------------- button */

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variantCls: Record<Variant, string> = {
  primary: 'bg-accent text-void hover:bg-[#8ec7ff] active:bg-[#5aa8f5] font-semibold',
  secondary: 'border border-line-strong bg-raised/60 text-ink hover:bg-raised hover:border-muted/50',
  ghost: 'text-muted hover:text-ink hover:bg-raised/70',
}
const sizeCls: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return clsx(
    'inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap transition-[background,border-color,color,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px',
    variantCls[variant],
    sizeCls[size],
    extra,
  )
}

export function Button({
  variant,
  size,
  className,
  ...rest
}: ComponentPropsWithoutRef<'button'> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />
}

export function ButtonLink({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />
}

/* ------------------------------------------------------------------ badges */

type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'moon' | 'mars' | 'earth'
const toneCls: Record<Tone, string> = {
  neutral: 'text-muted border-line-strong bg-raised/50',
  accent: 'text-accent border-accent/30 bg-accent/10',
  good: 'text-good border-good/30 bg-good/10',
  warn: 'text-warn border-warn/30 bg-warn/10',
  bad: 'text-bad border-bad/30 bg-bad/10',
  moon: 'text-moon border-moon/30 bg-moon/10',
  mars: 'text-mars border-mars/30 bg-mars/10',
  earth: 'text-earth border-earth/30 bg-earth/10',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] whitespace-nowrap',
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Mandatory label on anything derived from synthetic demonstration values. */
export function DemoBadge({ label = 'Demo data', className }: { label?: string; className?: string }) {
  return (
    <Badge tone="warn" className={className}>
      <FlaskConical aria-hidden className="size-3" />
      {label}
    </Badge>
  )
}

export function DemoNotice({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={clsx('flex items-start gap-3 rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3 text-[13px] text-warn/90', className)}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">
        {children ?? (
          <>
            <strong className="font-semibold text-warn">Demonstration data.</strong> Values shown here are synthetic placeholders
            used to exercise the interface. They are not NASA-derived measurements and must not be cited.
          </>
        )}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ panel */

export function Panel({ className, children, as: As = 'section', ...rest }: ComponentPropsWithoutRef<'section'> & { as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={clsx('panel', className)} {...rest}>
      {children}
    </As>
  )
}

export function PanelHeader({ title, eyebrow, action, className }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={clsx('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </header>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[28px] leading-[1.15] font-semibold sm:text-[34px]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/* --------------------------------------------------------- feedback states */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={clsx('size-4 animate-spin', className)} />
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-lg bg-raised/70', className)} />
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={clsx('flex items-center justify-center gap-2 py-12 text-sm text-muted', className)}>
      <Spinner /> {label}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: Error | string; onRetry?: () => void; className?: string }) {
  const msg = typeof error === 'string' ? error : error.message
  return (
    <div role="alert" className={clsx('flex flex-col items-center gap-3 rounded-xl border border-bad/25 bg-bad/[0.06] px-6 py-8 text-center', className)}>
      <AlertTriangle aria-hidden className="size-5 text-bad" />
      <p className="max-w-md text-sm text-ink/90">{msg}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center', className)}>
      {icon && <div className="grid size-11 place-items-center rounded-full bg-raised text-muted">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <div className="max-w-sm text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------- glossary term */

/** Inline term with an accessible definition tooltip (hover, focus or tap). */
export function Term({ term, children }: { term: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const def = GLOSSARY[term]
  if (!def) return <>{children ?? term}</>
  return (
    <span className="relative inline-flex items-baseline">
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="inline-flex cursor-help items-baseline gap-0.5 border-b border-dotted border-muted/60 text-inherit [letter-spacing:inherit] [text-transform:inherit]"
      >
        {children ?? term}
        <Info aria-hidden className="relative top-[1px] size-3 self-center text-muted" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={clsx(
          // Not rendered when closed: hidden-but-positioned tooltips would widen the page on mobile.
          'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-[min(16rem,70vw)] -translate-x-1/2 rounded-lg border border-line-strong bg-raised px-3 py-2 text-left font-sans text-xs leading-relaxed font-normal tracking-normal normal-case text-ink shadow-xl shadow-black/40',
          open ? 'block' : 'hidden',
        )}
      >
        {def}
      </span>
    </span>
  )
}

/* --------------------------------------------------------------- meters */

export function Meter({ value, color, label, className }: { value: number; color?: string; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-raised', className)}
    >
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${v * 100}%`, background: color ?? 'var(--color-accent)' }} />
    </div>
  )
}

export function Stat({ label, value, hint, accent }: { label: ReactNode; value: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="panel flex flex-col gap-2 px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-[26px] leading-none font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint && <p className="text-xs leading-snug text-muted">{hint}</p>}
    </div>
  )
}
