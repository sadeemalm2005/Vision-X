import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Planet } from '../../components/Planet'
import { Badge, PageHeader, Panel, PanelHeader } from '../../components/ui'

const OBJECTIVES = [
  'Integrate relevant open datasets from NASA, USGS and other authoritative providers.',
  'Harmonize datasets with appropriate coordinate systems, units and spatial scales.',
  'Extract terrain features from elevation models and imagery.',
  'Develop a transparent multi-feature similarity score.',
  'Adjust feature weights according to mission objectives.',
  'Provide explainable results, uncertainty indicators and data-quality notes.',
  'Display candidate sites and comparison evidence on an interactive map.',
]

const TECH = [
  ['Frontend', 'React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Motion'],
  ['Maps', 'Leaflet with NASA Solar System Treks (Moon/Mars, EPSG:4326) and Esri / CARTO basemaps'],
  ['Charts', 'Recharts plus purpose-built SVG/HTML charts for ranges and contributions'],
  ['Backend', 'Python 3, FastAPI, Pydantic; pure-Python similarity engine with pytest coverage'],
  ['Data layer', 'Pluggable DataProvider interface; demo provider now, dataset provider next'],
  ['Persistence', 'Browser localStorage for history and saved sites (no accounts in the prototype)'],
]

const FUTURE = [
  'Ingest the project DEMs and imagery; compute features over defined analysis windows.',
  'Patch-level search across wider Earth regions instead of a fixed candidate list.',
  'Unsupervised clustering of terrain patches; supervised models only with a defensible labelled set.',
  'Crater and rock detection where image resolution and labels support it.',
  'Sensitivity, ablation and resolution testing; expert review of interpretations.',
  'Grounded natural-language summaries built strictly from calculated values and metadata.',
]

export default function About() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="About the Project"
        title="Earth2Moon"
        description="An AI-assisted geospatial platform that searches for places on Earth whose measurable terrain resembles selected regions of the Moon or Mars, ranks them for a mission objective, and explains both the matches and their limits."
      />

      <Panel className="overflow-hidden">
        <div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
          <div className="max-w-2xl text-[15px] leading-relaxed text-muted">
            <p>
              Future human and robotic exploration needs extensive preparation and testing on Earth. Analog environments such as arid deserts,
              volcanic fields and impact structures support specific exercises, but finding the right one is hard: planetary and terrestrial
              datasets differ in resolution, coverage and measurement method, and manual comparison tends to favour familiar locations.
            </p>
            <p className="mt-4">
              The project&apos;s contribution is not a gallery of places that look extraterrestrial. It is a reproducible workflow that extracts
              measurable features, compares them at compatible scales, ranks candidates for a defined objective, and states where each comparison
              is weak.
            </p>
          </div>
          <div aria-hidden className="relative hidden h-[160px] w-[200px] md:block">
            <div className="absolute top-0 right-0"><Planet body="moon" size={64} spin={150} /></div>
            <div className="absolute bottom-0 left-0"><Planet body="earth" size={130} spin={90} /></div>
            <div className="absolute right-4 bottom-2"><Planet body="mars" size={48} spin={110} /></div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Research questions" title="What the project investigates" />
          <ul className="flex flex-col gap-3 p-5 text-[13.5px] leading-relaxed text-muted">
            {[
              'How can open planetary and terrestrial datasets be harmonized for meaningful comparison?',
              'Which measurable terrain features matter most for different exploration objectives?',
              'Can an automated similarity framework identify and rank candidate Earth locations?',
              'How can the platform explain why a site matches and where the comparison is weak?',
              'How should uncertainty, missing data and environmental differences be communicated?',
            ].map((q) => (
              <li key={q} className="flex gap-3"><span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />{q}</li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Objectives" title="What the prototype sets out to do" />
          <ol className="flex flex-col gap-2.5 p-5 text-[13.5px] leading-relaxed text-muted">
            {OBJECTIVES.map((o, i) => (
              <li key={o} className="grid grid-cols-[24px_1fr] gap-2"><span className="num text-faint">{i + 1}.</span>{o}</li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="Scientific approach" title="Hybrid, transparent, explainable" />
        <div className="grid gap-6 p-5 text-[13.5px] leading-relaxed text-muted md:grid-cols-3">
          <div>
            <p className="mb-1.5 font-medium text-ink">Established geospatial calculation first</p>
            <p>Slope, relief and roughness come from elevation models with standard methods. Machine learning is added only where suitable data and validation exist.</p>
          </div>
          <div>
            <p className="mb-1.5 font-medium text-ink">A weighted model you can read</p>
            <p>For a competition prototype, a transparent weighted similarity model is more credible than an untrained complex model. Every point of every score is attributable to a feature.</p>
          </div>
          <div>
            <p className="mb-1.5 font-medium text-ink">Honest about gaps</p>
            <p>Missing features are never counted as matches, resolution limits are enforced, and environmental differences are reported separately from terrain similarity.</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Technologies" title="How it is built" />
          <dl className="divide-y divide-line">
            {TECH.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-4 px-5 py-3 text-[13px]">
                <dt className="text-faint">{k}</dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Roadmap" title="Future development" />
          <ul className="flex flex-col gap-2.5 p-5 text-[13.5px] leading-relaxed text-muted">
            {FUTURE.map((f) => (
              <li key={f} className="flex gap-3"><span className="mt-2 size-1 shrink-0 rounded-full bg-accent-2" />{f}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="Status & credits" title="Current prototype status" />
        <div className="flex flex-col gap-4 p-5 text-[13.5px] leading-relaxed text-muted">
          <div className="flex flex-wrap gap-2">
            <Badge tone="good">Similarity engine · implemented & tested</Badge>
            <Badge tone="good">Interface & reports · implemented</Badge>
            <Badge tone="warn">Dataset ingestion · awaiting project data</Badge>
            <Badge tone="warn">Measurements · demonstration values</Badge>
          </div>
          <p>
            Planet imagery: NASA Blue Marble via NASA GIBS; LRO Wide Angle Camera mosaic (NASA/GSFC/Arizona State University); Viking MDIM 2.1
            colour mosaic and MOLA shaded relief (NASA/JPL/USGS/GSFC), served by NASA Solar System Treks. Earth basemaps © Esri and partners,
            © OpenStreetMap contributors, © CARTO.
          </p>
          <p className="text-faint">Earth2Moon is an independent research project and is not affiliated with or endorsed by NASA.</p>
          <div className="flex flex-wrap gap-4 pt-1">
            <Link to="/app/methodology" className="inline-flex items-center gap-1.5 text-accent hover:underline">Data & Methodology <ArrowRight aria-hidden className="size-3.5" /></Link>
            <Link to="/app/limitations" className="inline-flex items-center gap-1.5 text-accent hover:underline">Scientific Limitations <ArrowRight aria-hidden className="size-3.5" /></Link>
          </div>
        </div>
      </Panel>
    </div>
  )
}
