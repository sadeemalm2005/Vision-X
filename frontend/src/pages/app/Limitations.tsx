import { Check, X } from 'lucide-react'
import { Disclaimer } from '../../components/results/ResultParts'
import { ErrorState, LoadingBlock, PageHeader, Panel, PanelHeader } from '../../components/ui'
import { api } from '../../lib/api'
import { useApi } from '../../lib/useApi'

const ROWS: [string, string, string][] = [
  ['Gravity', 'Earth gravity is not lunar or Martian gravity.', 'Reported separately; never part of terrain similarity.'],
  ['Atmosphere and pressure', 'The Moon has almost none; Mars has a thin CO₂ atmosphere.', 'Shown as an environmental limitation on every report.'],
  ['Radiation', "Earth's atmosphere and magnetic field shield the surface.", 'No claim that terrain matching simulates radiation.'],
  ['Temperature extremes', 'Planetary surface temperatures vary far beyond Earth environments.', 'Treated as a separate environmental dimension.'],
  ['Spatial resolution', 'Small rocks and hazards may be below the pixel scale.', 'Feature marked unavailable when inputs are too coarse.'],
  ['Material composition', 'Similar-looking surfaces may differ in chemistry.', 'Requires spectral, geological or laboratory evidence.'],
  ['Data gaps and uncertainty', 'Missing or uncertain inputs can distort scores.', 'Coverage, score range and provenance displayed; score withheld when too thin.'],
]

const COMPARE_KEYS = ['gravity_ms2', 'atmosphere', 'surface_water', 'erosion', 'materials', 'craters'] as const
const LABELS: Record<(typeof COMPARE_KEYS)[number], string> = {
  gravity_ms2: 'Surface gravity',
  atmosphere: 'Atmosphere',
  surface_water: 'Surface water',
  erosion: 'Erosion',
  materials: 'Surface materials',
  craters: 'Craters',
}
const EARTH: Record<(typeof COMPARE_KEYS)[number], string> = {
  gravity_ms2: '9.81 m/s²',
  atmosphere: 'Dense, nitrogen- and oxygen-rich',
  surface_water: 'Abundant liquid water',
  erosion: 'Water, wind, ice and biological processes',
  materials: 'Highly varied rocks, soils and sediments',
  craters: 'Many modified or erased by erosion and tectonics',
}

export default function Limitations() {
  const bodies = useApi('bodies', api.bodies)
  const meta = useApi('meta', api.meta)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Scientific Limitations"
        title="Where the analogy ends"
        description="Earth cannot fully reproduce the Moon's or Mars's environment. Earth2Moon compares selected measurable terrain characteristics, and says clearly what that comparison does not cover."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="panel p-6">
          <p className="eyebrow mb-2 flex items-center gap-2 text-good"><Check aria-hidden className="size-3.5" /> Terrain similarity</p>
          <p className="text-[15px] leading-relaxed">Similarity between selected measurable terrain characteristics, such as relief, slope, roughness and crater shape, computed from data at a compatible scale.</p>
          <p className="mt-3 text-[13px] text-muted">This is what Earth2Moon measures and scores.</p>
        </div>
        <div className="panel p-6">
          <p className="eyebrow mb-2 flex items-center gap-2 text-mars"><X aria-hidden className="size-3.5" /> Environmental equivalence</p>
          <p className="text-[15px] leading-relaxed">Complete similarity in physical and environmental conditions: gravity, atmosphere, radiation, temperature, dust and material composition.</p>
          <p className="mt-3 text-[13px] text-muted">Earth cannot provide this. Earth2Moon never claims it.</p>
        </div>
      </div>

      <Panel>
        <PanelHeader eyebrow="Reference" title="Earth, Moon and Mars compared" />
        {bodies.error ? (
          <div className="p-5"><ErrorState error={bodies.error} onRetry={bodies.reload} /></div>
        ) : !bodies.data ? (
          <LoadingBlock />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] tracking-wide uppercase">
                  <th scope="col" className="px-5 py-2.5 font-medium text-faint">Characteristic</th>
                  <th scope="col" className="px-5 py-2.5 font-medium text-earth">Earth</th>
                  <th scope="col" className="px-5 py-2.5 font-medium text-moon">Moon</th>
                  <th scope="col" className="px-5 py-2.5 font-medium text-mars">Mars</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_KEYS.map((k) => (
                  <tr key={k} className="border-b border-line/60 align-top last:border-0">
                    <th scope="row" className="px-5 py-3 font-normal text-ink">{LABELS[k]}</th>
                    <td className="px-5 py-3 text-muted">{EARTH[k]}</td>
                    {(['moon', 'mars'] as const).map((b) => {
                      const v = bodies.data!.bodies[b]?.[k]
                      return <td key={b} className="px-5 py-3 text-muted">{k === 'gravity_ms2' ? `${v} m/s²` : String(v ?? '—')}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Handling" title="Limitations and how the platform deals with them" />
        <ul className="divide-y divide-line">
          {ROWS.map(([what, why, how]) => (
            <li key={what} className="grid gap-1 px-5 py-4 md:grid-cols-[200px_1fr_1fr] md:gap-6">
              <p className="text-[14px] font-medium">{what}</p>
              <p className="text-[13px] text-muted">{why}</p>
              <p className="text-[13px] text-ink/85">{how}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Scope" title="What Earth2Moon is, and is not" />
        <div className="grid gap-6 p-5 text-[13.5px] leading-relaxed md:grid-cols-2">
          <div>
            <p className="mb-2 font-medium text-good">A decision-support and research-discovery tool</p>
            <p className="text-muted">It narrows down where to look, shows the evidence behind each candidate, and makes data gaps visible so researchers can plan field work and further analysis.</p>
          </div>
          <div>
            <p className="mb-2 font-medium text-mars">Not a certification system</p>
            <p className="text-muted">It does not certify astronaut safety, landing-site selection or mission readiness. Operational suitability and human safety require separate professional assessment.</p>
          </div>
        </div>
      </Panel>

      {meta.data && <Disclaimer text={meta.data.disclaimer} />}
    </div>
  )
}
