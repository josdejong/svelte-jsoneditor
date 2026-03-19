#!/usr/bin/env python3
"""Parse hset/set metadata file from stdin, output pretty-printed JSON to stdout.

Handles both:
  - hset <hash> <field> '<json>'   → entries[field] = parsed_json
  - set <key> '<json>'             → entries[key]   = parsed_json
"""
import json
import re
import sys

entries = {}
for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("#"):
        continue

    # Try HSET first: hset <hash> <field> '<json>'
    m = re.match(r"hset\s+\S+\s+(\S+)\s+'(.*)'$", line)
    if m:
        field, raw = m.group(1), m.group(2)
        raw = raw.replace("\\'", "'")
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict) and "id" in parsed[0]:
                parsed = sorted(parsed, key=lambda x: x.get("id", ""))
            entries[field] = parsed
        except json.JSONDecodeError:
            entries[field] = raw
        continue

    # Try SET: set <key> '<json>'
    m = re.match(r"set\s+(\S+)\s+'(.*)'$", line)
    if m:
        key, raw = m.group(1), m.group(2)
        raw = raw.replace("\\'", "'")
        try:
            entries[key] = json.loads(raw)
        except json.JSONDecodeError:
            entries[key] = raw
        continue

json.dump(entries, sys.stdout, indent=2, sort_keys=True, ensure_ascii=False)
print()
