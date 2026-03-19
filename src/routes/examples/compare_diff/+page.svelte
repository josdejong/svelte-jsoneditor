<script>
  import { onMount } from 'svelte'
  import JSONDiffViewer from '$lib/components/diff/JSONDiffViewer.svelte'

  const sampleLeft = {
    name: 'Boddle Math Game',
    version: '2.5.0',
    settings: {
      difficulty: 'medium',
      maxPlayers: 30,
      timeLimit: 60,
      features: {
        battles: true,
        rewards: true,
        leaderboard: false
      }
    },
    levels: [
      { id: 1, name: 'Addition Basics', minScore: 0 },
      { id: 2, name: 'Subtraction Fun', minScore: 100 },
      { id: 3, name: 'Multiply Madness', minScore: 250 }
    ],
    metadata: {
      createdBy: 'admin',
      lastUpdated: '2026-01-15T10:30:00Z',
      tags: ['math', 'education', 'game']
    }
  }

  const sampleRight = {
    name: 'Boddle Math Game',
    version: '2.6.0',
    settings: {
      difficulty: 'hard',
      maxPlayers: 35,
      timeLimit: 60,
      soundEnabled: true,
      features: {
        battles: true,
        rewards: true,
        leaderboard: true,
        achievements: true
      }
    },
    levels: [
      { id: 1, name: 'Addition Basics', minScore: 0 },
      { id: 2, name: 'Subtraction Fun', minScore: 100 },
      { id: 3, name: 'Multiply Madness', minScore: 250 },
      { id: 4, name: 'Division Discovery', minScore: 400 }
    ],
    metadata: {
      createdBy: 'admin',
      lastUpdated: '2026-03-19T14:00:00Z',
      tags: ['math', 'education', 'game', 'competitive'],
      reviewedBy: 'team-lead'
    }
  }

  // PR data state
  let prData = $state(null)
  let fileNames = $state([])
  let selectedFile = $state('')
  let leftJson = $state(sampleLeft)
  let rightJson = $state(sampleRight)
  let leftLabel = $state('v2.5.0 (before)')
  let rightLabel = $state('v2.6.0 (after)')
  let title = $state('Compare / Diff Viewer')
  let subtitle = $state(
    'Side-by-side JSON comparison with line-level and word-level diff highlighting. Navigate between changes, toggle to show only changes, or switch to tree mode for exploration.'
  )

  function selectFile(fileName) {
    selectedFile = fileName
    const file = prData.files[fileName]
    leftJson = file.base
    rightJson = file.head
  }

  onMount(async () => {
    try {
      const res = await fetch('/pr-diff-data.json')
      if (!res.ok) return

      const data = await res.json()
      prData = data
      fileNames = Object.keys(data.files)

      title = `PR #${data.prNumber} — ${data.prTitle}`
      subtitle = `Comparing ${data.baseRef} → ${data.headRef}`
      leftLabel = data.baseRef
      rightLabel = data.headRef

      if (fileNames.length > 0) {
        selectFile(fileNames[0])
      }
    } catch {
      // No PR data available, keep sample data
    }
  })
</script>

<svelte:head>
  <title>{title} | svelte-jsoneditor</title>
</svelte:head>

<h1>{title}</h1>

<p>{subtitle}</p>

{#if fileNames.length > 1}
  <div class="file-tabs">
    {#each fileNames as fileName}
      <button
        class="file-tab"
        class:active={selectedFile === fileName}
        onclick={() => selectFile(fileName)}
      >
        {fileName.replace('scripts/', '')}
      </button>
    {/each}
  </div>
{/if}

<div class="viewer">
  <JSONDiffViewer {leftJson} {rightJson} {leftLabel} {rightLabel} />
</div>

<style>
  .viewer {
    width: 100%;
    height: calc(100vh - 160px);
    min-height: 500px;
  }

  h1 {
    margin: 16px 0 8px;
  }

  p {
    margin: 0 0 12px;
    color: #636c76;
    font-size: 14px;
  }

  .file-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .file-tab {
    padding: 6px 14px;
    cursor: pointer;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    background: #fff;
    font-size: 13px;
    color: #57606a;
    transition: all 0.15s;
  }

  .file-tab:hover {
    background: #f0f0f0;
  }

  .file-tab.active {
    background: #0969da;
    color: #fff;
    border-color: #0969da;
    font-weight: 600;
  }
</style>
