# Jsonator

A JSON diff viewer for comparing structured data (JSON, Redis HSET/SET scripts) across Git branches, commits, and pull requests.

Built on top of [svelte-jsoneditor](https://github.com/josdejong/svelte-jsoneditor) with SvelteKit.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) — authenticated and available in PATH
- Node.js

## Setup

```
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Routes

### PR Diff

```
/{org}/{repo}/{pr_number}
```

Compare the base and head branches of a GitHub pull request. Files are fetched via `gh pr view` and only parseable files (JSON, HSET/SET) are shown.

**Example:**

```
/boddle-learning/metadata-scripts/42
```

### Branch Diff

```
/{org}/{repo}/diff/branches/{from}...{to}
```

Compare any two branches. Uses `...` as separator to support branch names with slashes.

**Examples:**

```
/boddle-learning/metadata-scripts/diff/branches/main...develop
/boddle-learning/metadata-scripts/diff/branches/main...feature/new-content
/boddle-learning/metadata-scripts/diff/branches/feature/bla...feature/sls
```

### Commit Diff

```
/{org}/{repo}/diff/sha/{from_sha}...{to_sha}
```

Compare any two specific commits by SHA.

**Example:**

```
/boddle-learning/metadata-scripts/diff/sha/abc1234...def5678
```

## How It Works

1. Resolves the repository locally (checks sibling directories first, falls back to a cached `gh repo clone`)
2. Fetches the relevant refs
3. Runs `git diff --name-only` (or uses PR file list) to find changed files
4. Attempts to parse each file as JSON or Redis HSET/SET format
5. Renders a side-by-side diff viewer for all parseable files

## License

[ISC](LICENSE.md)
