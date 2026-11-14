import clsx from 'clsx'
import {
  BookOpen,
  Bookmark,
  Compass,
  Database,
  Globe2,
  LayoutDashboard,
  ListOrdered,
  Menu,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'
import { Logo } from '../Logo'
import { Badge, DemoBadge } from '../ui'

const NAV = [
  { group: 'Workspace', items: [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/explore', label: 'Explore & Compare', icon: Compass },
    { to: '/app/results', label: 'Match Results', icon: ListOrdered },
    { to: '/app/atlas', label: 'Site Atlas', icon: Globe2 },
    { to: '/app/saved', label: 'Saved', icon: Bookmark },
  ] },
  { group: 'Reference', items: [
    { to: '/app/methodology', label: 'Data & Methodology', icon: Database },
    { to: '/app/limitations', label: 'Scientific Limitations', icon: ShieldAlert },
    { to: '/app/about', label: 'About the Project', icon: BookOpen },
  ] },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Application" className="flex flex-col gap-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="eyebrow mb-2 px-3 text-faint">{g.group}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors duration-150',
                      isActive ? 'bg-raised text-ink' : 'text-muted hover:bg-raised/50 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden
                        className={clsx('absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-accent transition-opacity', isActive ? 'opacity-100' : 'opacity-0')}
                      />
                      <Icon aria-hidden className={clsx('size-4', isActive ? 'text-accent' : 'text-faint group-hover:text-muted')} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function DataModeCard() {
  const meta = useApi('meta', api.meta)
  return (
    <div className="rounded-xl border border-line bg-base/60 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Data mode</p>
        {meta.data?.data_mode === 'demo' ? <DemoBadge label="Demo" /> : meta.data ? <Badge tone="good">NASA</Badge> : null}
      </div>
      {meta.error ? (
        <p className="text-xs leading-snug text-bad">Analysis service offline</p>
      ) : (
        <p className="text-xs leading-snug text-muted">
          {meta.data?.data_mode === 'real'
            ? 'LOLA · MOLA · NASADEM elevation data.'
            : 'Synthetic values until the project datasets are connected.'}
        </p>
      )}
    </div>
  )
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-dvh bg-base">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-void">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-void lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo to="/" />
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 pt-4 pb-4">
          <NavItems />
          <DataModeCard />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-void/90 px-4 backdrop-blur lg:hidden">
        <Logo to="/" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="grid size-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <div className={clsx('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
        <div className={clsx('absolute inset-0 bg-black/60 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={clsx(
            'absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col border-r border-line bg-void transition-transform duration-300 ease-[var(--ease-out-quint)]',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-14 items-center justify-between px-4">
            <Logo to="/" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation" className="grid size-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
            <NavItems onNavigate={() => setOpen(false)} />
            <DataModeCard />
          </div>
        </div>
      </div>

      <main id="main" className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
