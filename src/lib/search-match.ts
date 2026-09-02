// Bidirectional abbreviation-aware search matcher.
// e.g. searching "new york" matches "NYC", and "sf" matches "San Francisco".

const SYNONYMS: Array<[string, string]> = [
  ["nyc", "new york"],
  ["nyc", "new york city"],
  ["ny", "new york"],
  ["sf", "san francisco"],
  ["sfo", "san francisco"],
  ["la", "los angeles"],
  ["dc", "washington"],
  ["chi", "chicago"],
  ["philly", "philadelphia"],
  ["vegas", "las vegas"],
  ["nola", "new orleans"],
  ["stl", "st louis"],
  ["st", "saint"],
  ["mtn", "mountain"],
  ["ft", "fort"],
  ["pdx", "portland"],
  ["sea", "seattle"],
  ["atl", "atlanta"],
  ["bos", "boston"],
  ["den", "denver"],
  ["hou", "houston"],
  ["mia", "miami"],
  ["phx", "phoenix"],
  ["min", "minneapolis"],
];

function normalize(s: string): string {
  return " " + s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ") + " ";
}

function expand(text: string): string {
  const base = normalize(text);
  let out = base;
  for (const [a, b] of SYNONYMS) {
    if (base.includes(" " + a + " ")) out += " " + b + " ";
    if (base.includes(" " + b + " ")) out += " " + a + " ";
  }
  return out;
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = expand(text);
  const needle = normalize(q).trim();
  if (haystack.includes(needle)) return true;
  // Also try each token of an expanded query so multi-word abbrevs work.
  const expandedNeedle = expand(q).trim();
  return haystack.includes(expandedNeedle);
}
