#!/bin/bash
# Interactive JSON diff viewer for PRs with Redis hset/set or JSON files.
#
# Usage:
#   ./jsoneditor.sh --pr owner/repo/pull/244
#   ./jsoneditor.sh --pr 244 --repo owner/repo
#   ./jsoneditor.sh --pr 244 --repo owner/repo --port 5174
#   ./jsoneditor.sh --pr 244 --repo owner/repo --local-repo /path/to/clone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Parse arguments ---
PR_REF=""
GH_REPO=""
PORT=5173
LOCAL_REPO=""

usage() {
  echo "Usage: $0 --pr <PR_NUMBER|PR_URL> [--repo OWNER/REPO] [--port PORT] [--local-repo PATH]"
  echo ""
  echo "Options:"
  echo "  --pr             PR number or full URL (e.g. 244 or owner/repo/pull/244)"
  echo "  --repo           GitHub repo (e.g. owner/repo). Required if --pr is just a number."
  echo "  --port           Dev server port (default: 5173)"
  echo "  --local-repo     Path to local git clone (auto-discovered if not specified)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr)         PR_REF="${2:?--pr requires a value}"; shift 2 ;;
    --repo)       GH_REPO="${2:?--repo requires a value}"; shift 2 ;;
    --port)       PORT="${2:?--port requires a value}"; shift 2 ;;
    --local-repo) LOCAL_REPO="${2:?--local-repo requires a value}"; shift 2 ;;
    -h|--help)    usage ;;
    *)            echo "Unknown argument: $1"; usage ;;
  esac
done

[[ -z "$PR_REF" ]] && usage

# --- Parse PR reference ---
if [[ "$PR_REF" =~ ^([^/]+/[^/]+)/pull/([0-9]+)$ ]]; then
  GH_REPO="${BASH_REMATCH[1]}"
  PR_NUMBER="${BASH_REMATCH[2]}"
elif [[ "$PR_REF" =~ ^[0-9]+$ ]]; then
  PR_NUMBER="$PR_REF"
  if [[ -z "$GH_REPO" ]]; then
    echo "Error: --repo is required when --pr is just a number"
    usage
  fi
else
  echo "Error: Cannot parse PR reference: $PR_REF"
  echo "Expected: PR number (e.g. 244) or owner/repo/pull/NUMBER"
  exit 1
fi

REPO_NAME="${GH_REPO#*/}"

echo "Fetching PR #$PR_NUMBER from $GH_REPO..."

# --- Get PR info ---
PR_INFO=$(gh pr view "$PR_NUMBER" --repo "$GH_REPO" \
  --json baseRefName,headRefName,files,title,number)

BASE_REF_NAME=$(echo "$PR_INFO" | jq -r '.baseRefName')
HEAD_REF_NAME=$(echo "$PR_INFO" | jq -r '.headRefName')
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
PR_NUM=$(echo "$PR_INFO" | jq -r '.number')

echo "  Title: $PR_TITLE"
echo "  Base:  $BASE_REF_NAME"
echo "  Head:  $HEAD_REF_NAME"

# --- Find the local repo ---
if [[ -z "$LOCAL_REPO" ]]; then
  for candidate in \
    "$SCRIPT_DIR/../${REPO_NAME}/main" \
    "$SCRIPT_DIR/../${REPO_NAME}"; do
    if [[ -d "$candidate" ]] && git -C "$candidate" rev-parse --git-dir &>/dev/null; then
      LOCAL_REPO="$candidate"
      break
    fi
  done
fi

if [[ -z "$LOCAL_REPO" ]] || ! git -C "$LOCAL_REPO" rev-parse --git-dir &>/dev/null; then
  echo "Error: Could not find a local git clone for $GH_REPO."
  echo "Specify with --local-repo /path/to/repo"
  exit 1
fi

# --- Resolve parser ---
PARSER="$SCRIPT_DIR/tools/hset_to_json.py"
if [[ ! -f "$PARSER" ]]; then
  PARSER=""
  if [[ -n "$LOCAL_REPO" && -f "$LOCAL_REPO/tools/hset_to_json.py" ]]; then
    PARSER="$LOCAL_REPO/tools/hset_to_json.py"
  fi
fi

echo "  Using repo: $LOCAL_REPO"

# --- Fetch refs ---
echo "Fetching refs..."
git -C "$LOCAL_REPO" fetch origin "$BASE_REF_NAME" --quiet 2>/dev/null || true
git -C "$LOCAL_REPO" fetch origin "$HEAD_REF_NAME" --quiet 2>/dev/null || true

BASE_REF="origin/$BASE_REF_NAME"
HEAD_REF="origin/$HEAD_REF_NAME"

# --- Get changed files ---
CHANGED_FILES=$(echo "$PR_INFO" | jq -r '.files[].path')

if [[ -z "$CHANGED_FILES" ]]; then
  echo "No files changed in this PR."
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  /'

# --- Write individual JSON files to static/pr-diff/ ---
PR_DATA_DIR="$SCRIPT_DIR/static/pr-diff"
rm -rf "$PR_DATA_DIR"
mkdir -p "$PR_DATA_DIR"

FILE_LIST=""

while IFS= read -r filepath; do
  echo "  Parsing $filepath..."
  SAFE_NAME=$(echo "$filepath" | tr '/' '_')

  if [[ -n "$PARSER" ]]; then
    git -C "$LOCAL_REPO" show "${BASE_REF}:${filepath}" 2>/dev/null \
      | python3 "$PARSER" > "$PR_DATA_DIR/${SAFE_NAME}.base.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.base.json"
    git -C "$LOCAL_REPO" show "${HEAD_REF}:${filepath}" 2>/dev/null \
      | python3 "$PARSER" > "$PR_DATA_DIR/${SAFE_NAME}.head.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.head.json"
  else
    git -C "$LOCAL_REPO" show "${BASE_REF}:${filepath}" > "$PR_DATA_DIR/${SAFE_NAME}.base.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.base.json"
    git -C "$LOCAL_REPO" show "${HEAD_REF}:${filepath}" > "$PR_DATA_DIR/${SAFE_NAME}.head.json" 2>/dev/null || echo "{}" > "$PR_DATA_DIR/${SAFE_NAME}.head.json"
  fi

  FILE_LIST="${FILE_LIST}${filepath}|${SAFE_NAME}\n"
done <<< "$CHANGED_FILES"

# --- Write manifest ---
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
