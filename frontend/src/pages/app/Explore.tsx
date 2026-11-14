import clsx from 'clsx'
import { Bot, Check, ChevronDown, CircleSlash, Info, Lock, Navigation, Pickaxe, RotateCcw, Sparkles, Truck, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PlanetMap } from '../../components/map/PlanetMap'
import { Planet } from '../../components/Planet'
import { Badge, Button, DemoBadge, DemoNotice, ErrorState, LoadingBlock, PageHeader, Skeleton, Spinner, Term } from '../../components/ui'
import { api } from '../../lib/api'
import { useFeatureCatalog, useMissions } from '../../lib/catalog'
import { BODY_COLOR, BODY_LABEL, formatCoord, formatResolution, formatValue, pct } from '../../lib/format'
import { history } from '../../lib/storage'
import type { Body, FeatureAvailability, MissionProfile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { previewWeights } from '../../lib/weights'

const MISSION_ICON: Record<string, typeof Truck> = {
  rover_mobility: Truck,
  crater_navigation: Navigation,
  geological_research: Pickaxe,
  astronaut_training: Bot,
}

const PIPELINE = ['Validating selection', 'Loading target and site measurements', 'Checking resolution compatibility', 'Scoring feature similarity', 'Ranking and writing explanations']

/* ---------------------------------------------------------- step shell */

function Step({ n, title, description, done, active, children, id }: { n: number; title: string; description?: ReactNode; done: boolean; active: boolean; children: ReactNode; id: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={clsx('panel transition-opacity duration-300', !active && !done && 'opacity-55')}>
      <header className="flex items-start gap-4 px-5 pt-5 pb-4 sm:px-6">
        <span
          className={clsx(
            'num grid size-8 shrink-0 place-items-center rounded-full border text-[13px] transition-colors',
            done ? 'border-good/40 bg-good/10 text-good' : active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line-strong text-faint',
          )}
        >
          {done ? <Check aria-hidden className="size-4" /> : n}
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-[17px] font-semibold">{title}</h2>
          {description && <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{description}</p>}
        </div>
      </header>
      <div className="px-5 pb-6 sm:px-6">{active || done ? children : <p className="text-[13px] text-faint">Complete the previous step first.</p>}</div>
    </section>
  )
}

/* ------------------------------------------------------------- body */

function BodyChoice({ body, selected, onSelect }: { body: Body; selected: boolean; onSelect: () => void }) {
  const copy = {
    moon: { line: 'Mare plains, simple craters and highland boundaries.', g: '1.62 m/s²', src: 'LOLA · LROC' },
    mars: { line: 'Crater floors, ancient deltas and layered plains.', g: '3.71 m/s²', src: 'MOLA · HiRISE' },
  }[body]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'group relative flex cursor-pointer items-center gap-5 overflow-hidden rounded-xl border p-4 text-left transition-[border-color,background] duration-200 sm:p-5',
        selected ? 'bg-raised' : 'border-line bg-base/50 hover:border-line-strong hover:bg-raised/50',
      )}
      style={selected ? { borderColor: `${BODY_COLOR[body]}88` } : undefined}
    >
      <Planet body={body} size={76} spin={body === 'moon' ? 140 : 100} />
      <div className="min-w-0">
        <p className="font-display text-[20px] font-semibold" style={{ color: selected ? BODY_COLOR[body] : undefined }}>{BODY_LABEL[body]}</p>
        <p className="mt-1 text-[13px] leading-snug text-muted">{copy.line}</p>
        <p className="num mt-2 text-[11px] text-faint">g {copy.g} · {copy.src}</p>
      </div>
      {selected && (
        <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full" style={{ background: BODY_COLOR[body] }}>
          <Check aria-hidden className="size-3 text-void" />
        </span>
      )}
    </button>
  )
}

/* ---------------------------------------------------------- mission */

function MissionChoice({ m, selected, onSelect, catalogName }: { m: MissionProfile; selected: boolean; onSelect: () => void; catalogName: (id: string) => string }) {
  const Icon = MISSION_ICON[m.id] ?? Sparkles
  const top = Object.entries(m.weights).sort((a, b) => b[1] - a[1])
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'flex h-full cursor-pointer flex-col rounded-xl border p-4 text-left transition-[border-color,background] duration-200',
        selected ? 'border-accent/60 bg-accent/[0.06]' : 'border-line bg-base/50 hover:border-line-strong hover:bg-raised/50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={clsx('grid size-9 place-items-center rounded-lg border', selected ? 'border-accent/50 text-accent' : 'border-line-strong text-muted')}>
          <Icon aria-hidden className="size-[18px]" />
        </span>
        {selected && <Check aria-hidden className="size-4 text-accent" />}
      </div>
      <p className="mt-4 font-display text-[16px] font-semibold">{m.name}</p>
      <p className="mt-1 text-[13px] leading-snug text-muted">{m.summary}</p>
      <ul className="mt-4 flex flex-col gap-1.5">
        {top.map(([fid, w]) => (
          <li key={fid} className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11.5px]">
            <span className="flex items-center gap-2 text-muted">
              {catalogName(fid)}
              {m.required.includes(fid) && <span className="font-mono text-[9.5px] tracking-wide text-accent uppercase">req</span>}
            </span>
            <span className="num text-faint">{pct(w)}</span>
            <span className="col-span-2 h-1 rounded-full bg-raised">
              <span className="block h-full rounded-full bg-accent/60" style={{ width: `${w * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </button>
  )
}

/* ------------------------------------------------------- run progress */

function RunProgress({ stage }: { stage: number }) {
  return (
    <ol className="flex flex-col gap-2.5" aria-live="polite">
      {PIPELINE.map((label, i) => {
        const state = i < stage ? 'done' : i === stage ? 'active' : 'todo'
        return (
          <li key={label} className="flex items-center gap-3 text-[13px]">
            <span className={clsx('grid size-5 place-items-center rounded-full border', state === 'done' ? 'border-good/40 text-good' : state === 'active' ? 'border-accent/50 text-accent' : 'border-line-strong text-faint')}>
              {state === 'done' ? <Check aria-hidden className="size-3" /> : state === 'active' ? <Spinner className="size-3" /> : null}
            </span>
            <span className={state === 'todo' ? 'text-faint' : 'text-ink'}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/* =============================================================== page */

export default function Explore() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const catalog = useFeatureCatalog()
  const missions = useMissions()

  const [body, setBody] = useState<Body | null>((params.get('body') as Body) || null)
  const [targetId, setTargetId] = useState<string | null>(params.get('target'))
  const [missionId, setMissionId] = useState<string | null>(params.get('mission'))
  const [features, setFeatures] = useState<string[]>(params.get('features')?.split(',').filter(Boolean) ?? [])
  const [overrides, setOverrides] = useState<Record<string, number> | null>(null)
  const [showWeights, setShowWeights] = useState(false)
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const userTouchedFeatures = useRef(features.length > 0)

  const targets = useApi(body ? `targets:${body}` : null, () => api.targets(body!))
  const availability = useApi(targetId ? `avail:${targetId}` : null, () => api.targetFeatures(targetId!))
  const availById = useMemo(() => Object.fromEntries((availability.data ?? []).map((a) => [a.feature_id, a])) as Record<string, FeatureAvailability>, [availability.data])

  const target = targets.data?.find((t) => t.id === targetId) ?? null
  const mission = missionId ? missions.byId[missionId] : undefined

  // When mission or availability changes, default the feature selection to the
  // mission's features that can actually be compared (unless the user edited it).
  useEffect(() => {
    if (!mission || !availability.data || userTouchedFeatures.current) return
    setFeatures(Object.keys(mission.weights).filter((fid) => availById[fid]?.available))
    setOverrides(null)
  }, [mission, availability.data, availById])

  // Drop selections that are not valid for the new target.
  useEffect(() => {
    if (!availability.data) return
    setFeatures((fs) => fs.filter((f) => availById[f]?.available))
  }, [availability.data, availById])

  const weights = useMemo(() => previewWeights(features, mission?.weights ?? {}, overrides), [features, mission, overrides])
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0)
  const missingRequired = mission?.required.filter((r) => !features.includes(r)) ?? []

  const chooseBody = (b: Body) => {
    if (b === body) return
    setBody(b)
    setTargetId(null)
    setFeatures([])
    setOverrides(null)
    userTouchedFeatures.current = false
  }
  const chooseTarget = (id: string) => {
    setTargetId(id)
    userTouchedFeatures.current = false
  }
  const chooseMission = (id: string) => {
    setMissionId(id)
    setOverrides(null)
    userTouchedFeatures.current = false
  }
  const toggleFeature = (fid: string) => {
    userTouchedFeatures.current = true
    setFeatures((fs) => (fs.includes(fid) ? fs.filter((f) => f !== fid) : [...fs, fid]))
  }

  const problems: string[] = []
  if (!body) problems.push('Choose the Moon or Mars.')
  if (!targetId) problems.push('Choose a target region.')
  if (!missionId) problems.push('Choose a mission objective.')
  if (!features.length) problems.push('Select at least one terrain feature.')
  if (features.length && weightSum <= 0) problems.push('At least one feature needs a weight above zero.')
  const ready = problems.length === 0

  async function run() {
    if (!ready || running || !body || !targetId || !missionId) return
    setRunError(null)
    setRunning(true)
    setStage(0)
    const timer = window.setInterval(() => setStage((s) => Math.min(s + 1, PIPELINE.length - 1)), 260)
    try {
      const [result] = await Promise.all([
        api.analyze({
          body,
          target_id: targetId,
          mission_id: missionId,
          features,
          ...(overrides ? { weights: Object.fromEntries(features.map((f) => [f, overrides[f] ?? (mission?.weights[f] ?? 0.1) * 100])) } : {}),
        }),
        new Promise((r) => setTimeout(r, 1300)), // keep the pipeline readable
      ])
      window.clearInterval(timer)
      setStage(PIPELINE.length)
      history.add(result)
      navigate(`/app/results/${result.id}`)
    } catch (e) {
      window.clearInterval(timer)
      setRunError((e as Error).message)
      setRunning(false)
    }
  }

  const catalogName = (id: string) => catalog.byId[id]?.name ?? id

  return (
    <div>
      <PageHeader
        eyebrow="Explore & Compare"
        title="Find Earth analog sites"
        description="Choose a planetary target and a mission. Earth2Moon compares the selected terrain features against every candidate site and ranks them, showing what matches and what does not."
      />
      {(catalog.error || missions.error) && <ErrorState className="mb-6" error={(catalog.error ?? missions.error)!} onRetry={() => { catalog.reload(); missions.reload() }} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 1 ─ body */}
          <Step id="step-body" n={1} title="Select a planetary body" description="The body sets the target regions, imagery and the environmental differences reported with every result." done={!!body} active>
            <div className="grid gap-3 sm:grid-cols-2">
              <BodyChoice body="moon" selected={body === 'moon'} onSelect={() => chooseBody('moon')} />
              <BodyChoice body="mars" selected={body === 'mars'} onSelect={() => chooseBody('mars')} />
            </div>
          </Step>

          {/* 2 ─ target */}
          <Step id="step-target" n={2} title="Select a target region" description="Pick a region from the list or the map. Imagery is real NASA Trek mosaic; region measurements are demonstration values." done={!!targetId} active={!!body}>
            {targets.error ? (
              <ErrorState error={targets.error} onRetry={targets.reload} />
            ) : targets.loading || !targets.data ? (
              <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
                <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px]" />)}</div>
                <Skeleton className="h-[260px]" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                <ul className="flex flex-col gap-2" role="listbox" aria-label="Target regions">
                  {targets.data.map((t) => {
                    const sel = t.id === targetId
                    return (
                      <li key={t.id} role="option" aria-selected={sel}>
                        <button
                          type="button"
                          onClick={() => chooseTarget(t.id)}
                          className={clsx(
                            'w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-[border-color,background] duration-200',
                            sel ? 'bg-raised' : 'border-line bg-base/50 hover:border-line-strong hover:bg-raised/50',
                          )}
                          style={sel && body ? { borderColor: `${BODY_COLOR[body]}88` } : undefined}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[14.5px] font-medium">{t.name}</p>
                            {t.data_status === 'demo' ? <DemoBadge label="Demo" /> : <Badge tone="good">Data</Badge>}
                          </div>
                          <p className="mt-0.5 text-[12.5px] text-muted">{t.region_type} · <span className="num">{formatCoord(t.lat, t.lon)}</span></p>
                          {sel && <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{t.description}</p>}
                        </button>
                      </li>
                    )
                  })}
                  <li className="mt-1 flex items-start gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3 text-[12.5px] leading-relaxed text-muted">
                    <Upload aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
                    <span>
                      <span className="text-ink">Custom datasets.</span> Uploading your own DEM or imagery will be enabled once the project
                      data pipeline is connected; supported formats will be defined from the provided files.
                    </span>
                  </li>
                </ul>
                {body && (
                  <PlanetMap
                    body={body}
                    points={targets.data.map((t) => ({ id: t.id, name: t.name, lat: t.lat, lon: t.lon }))}
                    selectedId={targetId}
                    onSelect={chooseTarget}
                    zoom={targetId ? 5 : 2}
                    className="h-[280px] lg:h-full lg:min-h-[320px]"
                  />
                )}
              </div>
            )}
          </Step>

          {/* 3 ─ mission */}
          <Step id="step-mission" n={3} title="Select a mission objective" description="Each objective weights terrain features differently. Weights are prototype starting points, not validated values." done={!!missionId} active={!!targetId}>
            {missions.loading ? (
              <LoadingBlock />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {missions.data?.map((m) => (
                  <MissionChoice key={m.id} m={m} selected={m.id === missionId} onSelect={() => chooseMission(m.id)} catalogName={catalogName} />
                ))}
              </div>
            )}
          </Step>

          {/* 4 ─ features */}
          <Step
            id="step-features"
            n={4}
            title="Select terrain features"
            description={<>Only features with usable data for this target can be selected. <Term term="weight">Weights</Term> are normalized to 100% automatically.</>}
            done={!!missionId && features.length > 0}
            active={!!missionId}
          >
            {availability.error ? (
              <ErrorState error={availability.error} onRetry={availability.reload} />
            ) : availability.loading || !catalog.data ? (
              <LoadingBlock label="Checking data availability…" />
            ) : (
              <>
                <ul className="grid gap-2 md:grid-cols-2">
                  {catalog.data.map((spec) => {
                    const a = availById[spec.id]
                    const available = !!a?.available
                    const on = features.includes(spec.id)
                    const tm = target?.measurements[spec.id]
                    return (
                      <li key={spec.id}>
                        <label
                          className={clsx(
                            'flex h-full gap-3 rounded-xl border px-4 py-3 transition-[border-color,background] duration-200',
                            !available ? 'cursor-not-allowed border-line bg-base/30' : on ? 'cursor-pointer border-accent/50 bg-accent/[0.05]' : 'cursor-pointer border-line bg-base/50 hover:border-line-strong',
                          )}
                        >
                          <input type="checkbox" className="peer sr-only" checked={on} disabled={!available} onChange={() => toggleFeature(spec.id)} />
                          <span
                            aria-hidden
                            className={clsx(
                              'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent',
                              !available ? 'border-line-strong bg-raised/40' : on ? 'border-accent bg-accent text-void' : 'border-line-strong',
                            )}
                          >
                            {!available ? <Lock className="size-2.5 text-faint" /> : on ? <Check className="size-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                              <span className={clsx('text-[14px] font-medium', !available && 'text-muted')}>
                                {spec.name}
                                {mission?.required.includes(spec.id) && <span className="ml-2 font-mono text-[10px] tracking-wide text-accent uppercase">required</span>}
                              </span>
                              {on && <span className="num text-[12px] text-accent">{pct(weights[spec.id] ?? 0)}</span>}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{spec.description}</span>
                            {available ? (
                              <span className="num mt-1.5 block text-[11px] text-faint">
                                target {formatValue(tm?.value, spec)} · {formatResolution(a.target_resolution_m)} · {a.candidates_comparable}/{a.candidates_total} sites comparable
                              </span>
                            ) : (
                              <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-warn/90">
                                <CircleSlash aria-hidden className="size-3" /> {a?.reason ?? 'Unavailable'}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {missingRequired.length > 0 && (
                  <p className="mt-4 flex items-start gap-2 text-[12.5px] text-warn">
                    <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {missingRequired.map(catalogName).join(', ')} is required for this mission but is not selected or not available, so results may not reflect the objective.
                  </p>
                )}

                {/* advanced weights */}
                <div className="mt-5 rounded-xl border border-line">
                  <button
                    type="button"
                    onClick={() => setShowWeights((v) => !v)}
                    aria-expanded={showWeights}
                    className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-[13.5px]"
                  >
                    <span className="flex items-center gap-2">
                      Advanced: customize weights
                      {overrides && <Badge tone="accent">Custom</Badge>}
                    </span>
                    <ChevronDown aria-hidden className={clsx('size-4 text-muted transition-transform', showWeights && 'rotate-180')} />
                  </button>
                  {showWeights && (
                    <div className="border-t border-line px-4 py-4">
                      {features.length === 0 ? (
                        <p className="text-[13px] text-muted">Select features to adjust their weights.</p>
                      ) : (
                        <>
                          <ul className="flex flex-col gap-4">
                            {features.map((fid) => {
                              const raw = overrides?.[fid] ?? Math.round((mission?.weights[fid] ?? 0.1) * 100)
                              return (
                                <li key={fid} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-x-4 gap-y-1.5">
                                  <label htmlFor={`w-${fid}`} className="truncate text-[13px]">{catalogName(fid)}</label>
                                  <span className="num text-right text-[12.5px] text-accent">{pct(weights[fid] ?? 0)}</span>
                                  <input
                                    id={`w-${fid}`}
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={raw}
                                    onChange={(e) => {
                                      const base = Object.fromEntries(features.map((f) => [f, overrides?.[f] ?? Math.round((mission?.weights[f] ?? 0.1) * 100)]))
                                      setOverrides({ ...base, [fid]: Number(e.target.value) })
                                    }}
                                    className="col-span-2 h-1.5 w-full cursor-pointer accent-[#70B8FF]"
                                  />
                                </li>
                              )
                            })}
                          </ul>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-[12px] text-muted">
                            <span>Sliders set relative importance; the normalized share is shown on the right and always totals 100%.</span>
                            <Button variant="ghost" size="sm" onClick={() => setOverrides(null)} disabled={!overrides}>
                              <RotateCcw aria-hidden className="size-3.5" /> Reset to mission defaults
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </Step>
        </div>

        {/* summary / run */}
        <aside className="xl:sticky xl:top-8 xl:self-start">
          <div className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <p className="eyebrow">Step 5 · Run analysis</p>
              <h2 className="mt-1 text-[16px] font-semibold">Analysis setup</h2>
            </div>
            <dl className="divide-y divide-line text-[13px]">
              {[
                ['Body', body ? <span key="body" style={{ color: BODY_COLOR[body] }}>{BODY_LABEL[body]}</span> : null],
                ['Target', target?.name],
                ['Mission', mission?.name],
                ['Features', features.length ? `${features.length} selected` : null],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className={clsx('truncate text-right', !v && 'text-faint')}>{v ?? 'Not set'}</dd>
                </div>
              ))}
            </dl>
            {features.length > 0 && (
              <div className="border-t border-line px-5 py-4">
                <p className="eyebrow mb-2.5">Normalized weights</p>
                <div className="flex h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
                  {features.map((f, i) => (
                    <span key={f} style={{ width: `${(weights[f] ?? 0) * 100}%`, background: ['#70B8FF', '#8C9EFF', '#4C9FD8', '#C9D2DF', '#6FD4A8', '#E6C26E', '#D98655', '#9BAABC'][i % 8] }} />
                  ))}
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {features.map((f, i) => (
                    <li key={f} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 text-muted">
                        <span className="size-2 rounded-full" style={{ background: ['#70B8FF', '#8C9EFF', '#4C9FD8', '#C9D2DF', '#6FD4A8', '#E6C26E', '#D98655', '#9BAABC'][i % 8] }} />
                        {catalog.byId[f]?.short_name ?? f}
                      </span>
                      <span className="num text-ink">{pct(weights[f] ?? 0, 1)}</span>
                    </li>
                  ))}
                  <li className="mt-1 flex justify-between border-t border-line pt-1.5 text-[12px]">
                    <span className="text-muted">Total</span>
                    <span className="num">{pct(weightSum, 1)}</span>
                  </li>
                </ul>
              </div>
            )}
            <div className="border-t border-line px-5 py-5">
              {running ? (
                <RunProgress stage={stage} />
              ) : (
                <>
                  <Button size="lg" className="w-full" onClick={run} disabled={!ready}>
                    Find Earth Analog Sites
                  </Button>
                  {!ready && (
                    <ul className="mt-3 flex flex-col gap-1 text-[12px] text-muted">
                      {problems.map((p) => <li key={p}>· {p}</li>)}
                    </ul>
                  )}
                  {runError && <ErrorState className="mt-4 py-5" error={runError} onRetry={run} />}
                </>
              )}
            </div>
          </div>
          <DemoNotice className="mt-4">
            <strong className="font-semibold text-warn">Demonstration data.</strong> The engine and ranking rules are real; the terrain values they
            run on are synthetic placeholders until project datasets are connected.
          </DemoNotice>
        </aside>
      </div>
    </div>
  )
}
