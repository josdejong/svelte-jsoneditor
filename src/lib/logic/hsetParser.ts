/**
 * Parse a Redis hset/set metadata file into a JSON object.
 * Handles both:
 *   hset <hash> <field> '<json>'  → entries[field] = parsed_json
 *   set <key> '<json>'            → entries[key]   = parsed_json
 */
export function parseHsetFile(content: string): Record<string, unknown> {
  const entries: Record<string, unknown> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Try HSET: hset <hash> <field> '<json>'
    let match = trimmed.match(/^hset\s+\S+\s+(\S+)\s+'(.*)'$/)
    if (match) {
      const raw = match[2].replace(/\\'/g, "'")
      try {
        const parsed = JSON.parse(raw)
        entries[match[1]] = parsed
      } catch {
        entries[match[1]] = raw
      }
      continue
    }

    // Try SET: set <key> '<json>'
    match = trimmed.match(/^set\s+(\S+)\s+'(.*)'$/)
    if (match) {
      const raw = match[2].replace(/\\'/g, "'")
      try {
        entries[match[1]] = JSON.parse(raw)
      } catch {
        entries[match[1]] = raw
      }
      continue
    }
  }

  return entries
}
