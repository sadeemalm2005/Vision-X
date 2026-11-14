// Plain-language definitions surfaced through <Term> tooltips.
export const GLOSSARY: Record<string, string> = {
  similarity:
    'How alike two places are across the selected, measured terrain features, from 0 to 100. It is not a probability of mission success.',
  coverage:
    'Share of the total feature weight that could actually be compared because both places have usable data at an adequate resolution.',
  'lower bound':
    'The score if every missing feature were a complete mismatch. Sites are ranked by this value so that missing data never helps a site.',
  dem: 'Digital Elevation Model: a grid of surface heights from which slope, relief and roughness are derived.',
  slope: 'Steepness of the ground, in degrees, calculated from neighbouring elevation values.',
  roughness: 'How bumpy the surface is at small scales: the spread of heights around a local average plane.',
  relief: 'Difference between high and low ground within the analysis window.',
  'd/D': 'Crater depth divided by crater diameter. Fresh simple craters are deeper relative to their width.',
  'effective resolution':
    'The coarsest ground sampling of the two inputs being compared. A comparison can be no finer than its coarsest input.',
  analog:
    'A place on Earth that shares selected characteristics with a planetary environment and can support specific tests. Never a full substitute.',
  weight: 'How much a feature influences the overall score. Weights are always normalized to add up to 100%.',
}
