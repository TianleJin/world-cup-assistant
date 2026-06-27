// Common name discrepancies between The Odds API and football-data.org
const ALIASES: Record<string, string> = {
  'united states': 'usa',
  'united states of america': 'usa',
  'korea republic': 'south korea',
  "cote d'ivoire": 'ivory coast',
  'côte divoire': 'ivory coast',
  'republic of ireland': 'ireland',
}

export function normalizeTeamName(name: string | null | undefined): string {
  if (!name) return ''
  const lower = name.toLowerCase().trim()
  if (ALIASES[lower]) return ALIASES[lower]
  return lower
    .replace(/\b(fc|cf|sc|ac|afc|bvb)\b/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function teamsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const na = normalizeTeamName(a)
  const nb = normalizeTeamName(b)
  if (na === nb) return true
  // Check if all words of the shorter name appear in the longer
  const wa = na.split(' ').filter(Boolean)
  const wb = nb.split(' ').filter(Boolean)
  return wa.every(w => wb.includes(w)) || wb.every(w => wa.includes(w))
}
