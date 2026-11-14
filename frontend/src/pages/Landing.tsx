import clsx from 'clsx'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Database,
  GitCompareArrows,
  Map as MapIcon,
  Mountain,
  Navigation,
  Pickaxe,
  ScanSearch,
  Truck,
  X,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { Logo } from '../components/Logo'
import { Planet } from '../components/Planet'
import { ButtonLink, buttonClass } from '../components/ui'

/* ------------------------------------------------------------- helpers */

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="eyebrow mb-5 flex items-center gap-3">
      <span className="text-accent">{index}</span>
      <span className="h-px w-8 bg-line-strong" />
      {children}
    </p>
  )
}

/* -------------------------------------------------------------- header */

function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const links = [
    ['#how', 'How it works'],
    ['#missions', 'Missions'],
    ['#transparency', 'Transparency'],
    ['#data', 'Data'],
  ]
  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-40 transition-[background,border-color,backdrop-filter] duration-300',
        scrolled ? 'border-b border-line bg-void/80 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 text-[13.5px] text-muted transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <ButtonLink to="/app" variant="secondary" size="sm">
          Launch platform <ArrowRight aria-hidden className="size-3.5" />
        </ButtonLink>
      </div>
    </header>
  )
}

/* ---------------------------------------------------------------- hero */

function HeroVisual() {
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[560px]">
      {/* orbit rings */}
      <svg viewBox="0 0 560 560" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4C9FD8" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#4C9FD8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="280" cy="300" r="250" fill="url(#halo)" />
        <ellipse cx="280" cy="300" rx="250" ry="250" fill="none" stroke="rgba(112,184,255,0.16)" strokeDasharray="2 6" />
        <ellipse cx="280" cy="300" rx="190" ry="190" fill="none" stroke="rgba(155,170,188,0.14)" />
        {/* leader lines to labels */}
        <path d="M455 150 L500 118 L548 118" fill="none" stroke="rgba(201,210,223,0.4)" />
        <path d="M120 418 L78 456 L14 456" fill="none" stroke="rgba(217,134,85,0.45)" />
        <path d="M280 145 L280 70" fill="none" stroke="rgba(76,159,216,0.35)" strokeDasharray="2 4" />
      </svg>
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2" style={{ width: '50%' }}>
        <Planet body="earth" size="min(280px, 50vw)" spin={90} />
      </div>
      <div className="absolute top-[17%] right-[11%]">
        <Planet body="moon" size="min(86px, 15vw)" spin={160} />
      </div>
      <div className="absolute bottom-[14%] left-[12%]">
        <Planet body="mars" size="min(112px, 20vw)" spin={110} />
      </div>
      {/* HUD labels: published reference values only */}
      <div className="absolute top-[13%] right-0 hidden text-right sm:block">
        <p className="font-mono text-[10px] tracking-[0.14em] text-moon uppercase">Moon</p>
        <p className="num text-[11px] text-muted">g 1.62 m/s²</p>
      </div>
      <div className="absolute bottom-[12%] left-0 hidden sm:block">
        <p className="font-mono text-[10px] tracking-[0.14em] text-mars uppercase">Mars</p>
        <p className="num text-[11px] text-muted">g 3.71 m/s²</p>
      </div>
      <div className="absolute top-[6%] left-1/2 hidden -translate-x-1/2 text-center sm:block">
        <p className="font-mono text-[10px] tracking-[0.14em] text-earth uppercase">Earth</p>
        <p className="num text-[11px] text-muted">g 9.81 m/s²</p>
      </div>
    </div>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  const fade = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.22, 1, 0.36, 1] as const } })
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:min-h-[92vh] lg:pb-24">
      <div className="starfield pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-void" />
      <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <div className="max-w-xl">
          <motion.p {...fade(0)} className="eyebrow mb-6 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" /> Planetary analog site finder
          </motion.p>
          <motion.h1 {...fade(0.08)} className="text-[44px] leading-[1.02] font-semibold sm:text-[60px] lg:text-[68px]">
            Find Earth.
            <br />
            <span className="text-muted">Explore Beyond.</span>
          </motion.h1>
          <motion.p {...fade(0.16)} className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
            Discover Earth&apos;s most promising planetary analog environments. Compare real terrain data with the Moon and Mars,
            powered by geospatial intelligence.
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/app/explore" size="lg">
              Start Exploring <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <a href="#how" className={buttonClass('secondary', 'lg')}>
              Discover How It Works
            </a>
          </motion.div>
          <motion.p {...fade(0.32)} className="mt-10 max-w-md text-xs leading-relaxed text-faint">
            Prototype for research discovery. Terrain similarity is not environmental equivalence, and current results use labelled
            demonstration data while project datasets are integrated.
          </motion.p>
        </div>
        <HeroVisual />
      </div>
      <a href="#problem" aria-label="Scroll to introduction" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-faint transition-colors hover:text-ink lg:block">
        <ChevronDown className="size-5 animate-bounce" />
      </a>
    </section>
  )
}

/* -------------------------------------------------------------- problem */

function Problem() {
  return (
    <section id="problem" className="relative border-t border-line py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <Reveal>
          <SectionLabel index="01">The problem</SectionLabel>
          <h2 className="text-[34px] leading-[1.08] font-semibold sm:text-[46px]">
            Test it on Earth.
            <br />
            <span className="text-muted">Fly it to the Moon.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-muted">
            Before a rover drives on the Moon or Mars, its technology has to be tested somewhere real. The hard part is knowing
            which place on Earth is the best stand-in, and for which test. Planetary and terrestrial data sit in separate
            archives, at different resolutions and in different coordinate systems.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col justify-end">
          <p className="eyebrow mb-5">How Earth2Moon approaches it</p>
          <ol className="flex flex-col divide-y divide-line border-y border-line">
            {[
              ['Measure, don’t eyeball', 'Compare elevation, slope, roughness and crater shape as numbers, not as photographs that look alike.'],
              ['Rank for a mission', 'A rover test and a geology field trip need different terrain, so each mission weights features differently.'],
              ['Explain where it ends', 'Every result shows which features match, which differ, and what Earth simply cannot reproduce.'],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[36px_1fr] gap-4 py-5">
                <span className="num pt-0.5 text-sm text-accent">0{i + 1}</span>
                <div>
                  <p className="font-display text-[17px] font-medium">{t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- how it works */

const STEPS = [
  { icon: Database, title: 'Collect', text: 'Integrate NASA planetary datasets and Earth geographic information, recording source and resolution.' },
  { icon: ScanSearch, title: 'Analyze', text: 'Extract elevation, slope, roughness, crater morphology and other features the data can support.' },
  { icon: GitCompareArrows, title: 'Match', text: 'Calculate feature-level similarity, apply mission weights and rank candidate Earth locations.' },
  { icon: MapIcon, title: 'Explore', text: 'Inspect ranked sites on a map, compare terrain characteristics and read the limitations.' },
]

function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-line bg-base py-24 sm:py-32">
      <div className="hairline-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <SectionLabel index="02">How it works</SectionLabel>
          <h2 className="text-[32px] leading-[1.1] font-semibold sm:text-[42px]">From planetary data to a ranked, explained map.</h2>
        </Reveal>
        <ol className="relative mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div aria-hidden className="absolute top-[22px] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 lg:block" />
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <li className="relative">
                <div className="relative z-10 mb-6 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full border border-accent/40 bg-void text-accent">
                    <Icon aria-hidden className="size-[18px]" />
                  </span>
                  <span className="num text-xs text-faint">STEP 0{i + 1}</span>
                </div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- fingerprint */

const SAMPLE = [
  { axis: 'Relief', a: 0.62, b: 0.55 },
  { axis: 'Slope', a: 0.78, b: 0.7 },
  { axis: 'Roughness', a: 0.55, b: 0.6 },
  { axis: 'Variability', a: 0.48, b: 0.4 },
  { axis: 'Craters', a: 0.35, b: 0.3 },
]

function Fingerprint() {
  return (
    <section className="border-t border-line py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <SectionLabel index="03">The terrain fingerprint</SectionLabel>
          <h2 className="text-[32px] leading-[1.1] font-semibold sm:text-[42px]">One scale for a Martian plain and a desert on Earth.</h2>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-muted">
            Every place is described with the same measurable features. Each feature is compared separately, weighted for the
            mission, and combined into a transparent score.
          </p>
          <div className="mt-8 inline-flex flex-col gap-2 rounded-xl border border-line bg-surface px-5 py-4">
            <p className="font-display text-[22px] tracking-tight">
              S = 100 × Σ (w<sub className="text-[0.6em]">i</sub> × s<sub className="text-[0.6em]">i</sub>)
            </p>
            <p className="text-xs leading-relaxed text-muted">
              w = mission weight (sums to 1) · s = feature similarity, 0 to 1. A similarity score, not a probability of mission success.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <figure className="panel relative p-5">
            <div className="h-[320px]">
              <ResponsiveContainer>
                <RadarChart data={SAMPLE} outerRadius="74%">
                  <PolarGrid stroke="rgba(155,170,188,0.14)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#9BAABC', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                  <Radar dataKey="a" stroke="#D98655" fill="#D98655" fillOpacity={0.16} strokeWidth={1.5} isAnimationActive={false} />
                  <Radar dataKey="b" stroke="#4C9FD8" fill="#4C9FD8" fillOpacity={0.2} strokeWidth={1.5} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
              <span className="flex gap-4">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-mars" /> Mars target</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-earth" /> Earth candidate</span>
              </span>
              <span className="italic">Illustrative shape with sample values, not a result.</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- missions */

const MISSION_PREVIEW = [
  { icon: Truck, title: 'Rover Mobility Testing', text: 'Realistic slopes and rough ground for driving, climbing and obstacle avoidance.', tags: ['Slope', 'Roughness', 'Relief', 'Obstacles'], color: '#D98655' },
  { icon: Navigation, title: 'Crater Navigation', text: 'Comparable crater shape and rim relief for path planning and localisation.', tags: ['Crater d/D', 'Rim relief', 'Slope'], color: '#C9D2DF' },
  { icon: Pickaxe, title: 'Geological Field Research', text: 'Mapped geology and surface context for sampling and field-science rehearsal.', tags: ['Geology', 'Rock units', 'Regolith'], color: '#8C9EFF' },
  { icon: Bot, title: 'Astronaut Field Training', text: 'Diverse terrain for traverses and operations practice, subject to safety review.', tags: ['Variability', 'Elevation', 'Overall'], color: '#4C9FD8' },
]

function Missions() {
  return (
    <section id="missions" className="border-t border-line bg-base py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <SectionLabel index="04">Mission objectives</SectionLabel>
            <h2 className="text-[32px] leading-[1.1] font-semibold sm:text-[42px]">Different tests need different terrain.</h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-muted">A single universal score would mislead. Each objective reweights the features that matter for it.</p>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {MISSION_PREVIEW.map(({ icon: Icon, title, text, tags, color }, i) => (
            <Reveal key={title} delay={i * 0.06} className="h-full">
              <article className="group flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-raised/60 sm:p-9">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl border border-line-strong" style={{ color }}>
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="num text-xs text-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-8 text-[21px] font-semibold">{title}</h3>
                <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted">{text}</p>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-7">
                  {tags.map((t) => (
                    <li key={t} className="rounded-md border border-line-strong px-2 py-1 font-mono text-[11px] text-muted">{t}</li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- transparency */

function Transparency() {
  const compare = ['Elevation and local relief', 'Slope and terrain variability', 'Surface roughness', 'Crater morphology', 'Rocks and geology, where data resolution allows']
  const cannot = ['Lunar or Martian gravity', 'The Moon’s near-absence of atmosphere', 'Mars’s thin carbon-dioxide atmosphere', 'Space radiation and temperature extremes', 'Lunar and Martian dust and regolith']
  return (
    <section id="transparency" className="border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <SectionLabel index="05">Scientific transparency</SectionLabel>
          <h2 className="text-[32px] leading-[1.1] font-semibold sm:text-[42px]">Terrain similarity is not environmental equivalence.</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="panel h-full p-7">
              <p className="eyebrow mb-1 text-good">Terrain similarity</p>
              <p className="text-[14.5px] text-muted">Similarity between selected measurable terrain characteristics. What we compare:</p>
              <ul className="mt-6 flex flex-col gap-3">
                {compare.map((c) => (
                  <li key={c} className="flex items-center gap-3 text-[15px]">
                    <span className="grid size-6 place-items-center rounded-full bg-good/12 text-good"><Check aria-hidden className="size-3.5" /></span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel h-full p-7">
              <p className="eyebrow mb-1 text-mars">Environmental equivalence</p>
              <p className="text-[14.5px] text-muted">Complete similarity in physical conditions, which Earth cannot provide. Never claimed:</p>
              <ul className="mt-6 flex flex-col gap-3">
                {cannot.map((c) => (
                  <li key={c} className="flex items-center gap-3 text-[15px]">
                    <span className="grid size-6 place-items-center rounded-full bg-mars/12 text-mars"><X aria-hidden className="size-3.5" /></span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <p className="mt-8 max-w-3xl text-[14px] leading-relaxed text-muted">
            Every comparison report includes a <span className="text-ink">&ldquo;Where it differs&rdquo;</span> section, the data coverage
            behind the score, and the features that could not be measured. Earth2Moon is a decision-support and research-discovery tool,
            not a certification of astronaut safety, landing-site selection or mission readiness.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- data */

const SOURCES = [
  { body: 'Moon', color: 'text-moon', items: [['LOLA', 'Lunar Orbiter Laser Altimeter'], ['LROC', 'Lunar Reconnaissance Orbiter Camera']] },
  { body: 'Mars', color: 'text-mars', items: [['MOLA', 'Mars Orbiter Laser Altimeter'], ['HiRISE', 'High Resolution Imaging Science Experiment']] },
  { body: 'Earth', color: 'text-earth', items: [['SRTM', 'Shuttle Radar Topography Mission'], ['ASTER GDEM', 'Global Digital Elevation Model'], ['Earthdata · USGS', 'Discovery portals and geological maps']] },
]

function DataSources() {
  return (
    <section id="data" className="border-t border-line bg-base py-24 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <SectionLabel index="06">Data sources</SectionLabel>
            <h2 className="text-[30px] leading-[1.12] font-semibold sm:text-[38px]">Built for authoritative, open datasets.</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Every input records its instrument, resolution and processing level, and comparisons run at a scale the coarsest input can
              support. Dataset integration is in progress. Until then, the platform runs on clearly labelled demonstration values.
            </p>
            <Link to="/app/methodology" className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
              Read the data &amp; methodology <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {SOURCES.map((g) => (
              <div key={g.body} className="bg-surface p-6">
                <p className={clsx('eyebrow mb-5', g.color)}>{g.body}</p>
                <ul className="flex flex-col gap-4">
                  {g.items.map(([k, v]) => (
                    <li key={k}>
                      <p className="font-display text-[17px] font-medium">{k}</p>
                      <p className="text-[12.5px] leading-snug text-muted">{v}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- final CTA */

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line py-28 sm:py-36">
      <div className="starfield pointer-events-none absolute inset-0 opacity-50" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-40 opacity-80 sm:-right-10">
        <Planet body="moon" size={420} spin={240} />
      </div>
      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <Mountain aria-hidden className="mb-8 size-6 text-accent" />
          <h2 className="text-[38px] leading-[1.05] font-semibold sm:text-[56px]">Your next mission starts on Earth.</h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted">Choose a target, pick a mission and see which Earth sites fit, and where they do not.</p>
          <ButtonLink to="/app" size="lg" className="mt-9">
            Explore the Platform <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-void">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-[13px] leading-relaxed text-muted">An AI-assisted geospatial research prototype for identifying Earth analog sites for lunar and Martian exploration.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-2 text-[13px]">
          <Link className="text-muted hover:text-ink" to="/app/explore">Explore & Compare</Link>
          <Link className="text-muted hover:text-ink" to="/app/methodology">Data & Methodology</Link>
          <Link className="text-muted hover:text-ink" to="/app/atlas">Site Atlas</Link>
          <Link className="text-muted hover:text-ink" to="/app/limitations">Limitations</Link>
          <Link className="text-muted hover:text-ink" to="/app/results">Match Results</Link>
          <Link className="text-muted hover:text-ink" to="/app/about">About</Link>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1240px] px-4 py-5 text-[11.5px] leading-relaxed text-faint sm:px-6">
          Planet imagery: NASA Blue Marble via NASA GIBS; LRO WAC mosaic (NASA/GSFC/ASU) and Viking MDIM 2.1 (NASA/JPL/USGS) via NASA
          Solar System Treks. Earth2Moon is an independent project and is not affiliated with or endorsed by NASA.
        </p>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="bg-void">
      <SiteHeader />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Fingerprint />
        <Missions />
        <Transparency />
        <DataSources />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
