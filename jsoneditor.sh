#!/bin/bash
# Interactive JSON diff viewer for metadata-scripts PRs.
#
# Fetches base/head metadata from a GitHub PR, parses hset files to JSON,
# and launches the svelte-jsoneditor compare/diff viewer.
#
# Usage:
#   ./jsoneditor.sh --pr boddle-learning/metadata-scripts/pull/244
#   ./jsoneditor.sh --pr 244                                         # defaults to boddle-learning/metadata-scripts
#   ./jsoneditor.sh --pr 244 --port 5174
#   ./jsoneditor.sh --pr 244 --metadata-repo /path/to/metadata-scripts/main

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_REPO="boddle-learning/metadata-scripts"
DEFAULT_METADATA_REPO="$(cd "$SCRIPT_DIR/../metadata-scripts/main" 2>/dev/null && pwd || echo "")"

# --- Parse arguments ---
PR_REF=""
PORT=5173
METADATA_REPO=""

usage() {
  echo "Usage: $0 --pr <PR_NUMBER|PR_URL> [--port PORT] [--metadata-repo PATH]"
  echo ""
  echo "Options:"
  echo "  --pr             PR number or full URL (e.g. 244 or boddle-learning/metadata-scripts/pull/244)"
  echo "  --port           Dev server port (default: 5173)"
  echo "  --metadata-repo  Path to metadata-scripts working tree (for hset_to_json.py)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr)      PR_REF="${2:?--pr requires a value}"; shift 2 ;;
    --port)    PORT="${2:?--port requires a value}"; shift 2 ;;
    --metadata-repo) METADATA_REPO="${2:?--metadata-repo requires a value}"; shift 2 ;;
    -h|--help) usage ;;
    *)         echo "Unknown argument: $1"; usage ;;
  esac
done

[[ -z "$PR_REF" ]] && usage

# --- Resolve metadata-scripts repo and parser ---
if [[ -z "$METADATA_REPO" ]]; then
  METADATA_REPO="$DEFAULT_METADATA_REPO"
fi

PARSER=""
if [[ -n "$METADATA_REPO" && -f "$METADATA_REPO/tools/hset_to_json.py" ]]; then
  PARSER="$METADATA_REPO/tools/hset_to_json.py"
fi

# --- Parse PR reference ---
GH_REPO="$DEFAULT_REPO"

if [[ "$PR_REF" =~ ^([^/]+/[^/]+)/pull/([0-9]+)$ ]]; then
  GH_REPO="${BASH_REMATCH[1]}"
  PR_NUMBER="${BASH_REMATCH[2]}"
elif [[ "$PR_REF" =~ ^[0-9]+$ ]]; then
  PR_NUMBER="$PR_REF"
else
  echo "Error: Cannot parse PR reference: $PR_REF"
  echo "Expected: PR number (e.g. 244) or owner/repo/pull/NUMBER"
  exit 1
fi

echo "Fetching PR #$PR_NUMBER from $GH_REPO..."

# --- Get PR info (small JSON, jq is fine here) ---
PR_INFO=$(gh pr view "$PR_NUMBER" --repo "$GH_REPO" \
  --json baseRefName,headRefName,files,title,number)

BASE_REF_NAME=$(echo "$PR_INFO" | jq -r '.baseRefName')
HEAD_REF_NAME=$(echo "$PR_INFO" | jq -r '.headRefName')
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
PR_NUM=$(echo "$PR_INFO" | jq -r '.number')

echo "  Title: $PR_TITLE"
echo "  Base:  $BASE_REF_NAME"
echo "  Head:  $HEAD_REF_NAME"

# --- Find the metadata-scripts git dir ---
if [[ -z "$METADATA_REPO" || ! -d "$METADATA_REPO/.git" ]] && [[ -z "$METADATA_REPO" || ! -f "$METADATA_REPO/.git" ]]; then
  for candidate in \
    "$SCRIPT_DIR/../metadata-scripts/main" \
    "$SCRIPT_DIR/../metadata-scripts" \
    "$HOME/Work/boddle-projects/metadata-scripts/main"; do
    if [[ -d "$candidate" ]] && git -C "$candidate" rev-parse --git-dir &>/dev/null; then
      METADATA_REPO="$candidate"
      break
    fi
  done
fi

if [[ -z "$METADATA_REPO" ]] || ! git -C "$METADATA_REPO" rev-parse --git-dir &>/dev/null; then
  echo "Error: Could not find metadata-scripts git repo."
  echo "Specify with --metadata-repo /path/to/metadata-scripts/main"
  exit 1
fi

if [[ -z "$PARSER" && -f "$METADATA_REPO/tools/hset_to_json.py" ]]; then
  PARSER="$METADATA_REPO/tools/hset_to_json.py"
fi

echo "  Using repo: $METADATA_REPO"

# --- Fetch refs ---
echo "Fetching refs..."
git -C "$METADATA_REPO" fetch origin "$BASE_REF_NAME" --quiet 2>/dev/null || true
git -C "$METADATA_REPO" fetch origin "$HEAD_REF_NAME" --quiet 2>/dev/null || true

BASE_REF="origin/$BASE_REF_NAME"
HEAD_REF="origin/$HEAD_REF_NAME"

# --- Get changed files ---
CHANGED_FILES=$(echo "$PR_INFO" | jq -r '.files[].path' | grep '^scripts/' || true)

if [[ -z "$CHANGED_FILES" ]]; then
  echo "No script files changed in this PR."
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  /'

# --- Write individual JSON files to static/pr-diff/ ---
# No jq on large data — just pipe git show through the hset parser straight to files.
PR_DATA_DIR="$SCRIPT_DIR/static/pr-diff"
rm -rf "$PR_DATA_DIR"
mkdir -p "$PR_DATA_DIR"

FILE_LIST=""

while IFS= read -r filepath; do
  echo "  Parsing $filepath..."

  # Sanitize filename: scripts/metadata_items -> metadata_items
  SAFE_NAME=$(echo "$filepath" | tr '/' '_')

  if [[ -n "$PARSER" ]]; then
    git -C "$METADATA_REPO" show "${BASE_REF}:${filepath}" 2>/dev/null \
      | python3 "$PARSER" > "$PR_DATA_DIR/${SAFE_NAME}.base.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.base.json"
    git -C "$METADATA_REPO" show "${HEAD_REF}:${filepath}" 2>/dev/null \
      | python3 "$PARSER" > "$PR_DATA_DIR/${SAFE_NAME}.head.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.head.json"
  else
    git -C "$METADATA_REPO" show "${BASE_REF}:${filepath}" > "$PR_DATA_DIR/${SAFE_NAME}.base.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.base.json"
    git -C "$METADATA_REPO" show "${HEAD_REF}:${filepath}" > "$PR_DATA_DIR/${SAFE_NAME}.head.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.head.json"
  fi

  # Append to file list (newline-separated "path|safename" pairs)
  FILE_LIST="${FILE_LIST}${filepath}|${SAFE_NAME}\n"
done <<< "$CHANGED_FILES"

# --- Write a small manifest (only scalar metadata, no large JSON) ---
cat > "$PR_DATA_DIR/manifest.json" <<MANIFEST
{
  "prNumber": $PR_NUM,
  "prTitle": $(python3 -c "import json; print(json.dumps('$PR_TITLE'))"),
  "baseRef": "$BASE_REF",
  "headRef": "$HEAD_REF",
  "files": [
$(echo -e "$FILE_LIST" | sed '/^$/d' | while IFS='|' read -r path safe; do
  echo "    {\"path\": \"$path\", \"key\": \"$safe\"},"
done | sed '$ s/,$//')
  ]
}
MANIFEST

TOTAL_FILES=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
echo ""
echo "PR #$PR_NUM: $PR_TITLE"
echo "Files: $TOTAL_FILES"
echo ""
echo "Starting diff viewer at http://localhost:$PORT/examples/compare_diff"
echo "Press Ctrl+C to stop."
echo ""

# --- Clean up on exit ---
cleanup() {
  rm -rf "$SCRIPT_DIR/static/pr-diff"
}
trap cleanup EXIT

# --- Launch dev server ---
cd "$SCRIPT_DIR"
npx vite dev --port "$PORT" --open "/examples/compare_diff"
