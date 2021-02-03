<script>
	import { JSONEditor } from 'svelte-jsoneditor'

	let json = {
		'array': [1, 2, 3],
		'boolean': true,
		'color': '#82b92c',
		'null': null,
		'number': 123,
		'object': {'a': 'b', 'c': 'd'},
		'time': 1575599819000,
		'string': 'Hello World'
	}

	let text = JSON.stringify({
		greeting: 'hello world'
	}, null, 2)

	let showTreeEditor = true
	let showCodeEditor = true
	let indentation = 2
</script>

<main>
	<h1>svelte-jsoneditor development application</h1>
	<p>
		<label>
			Indentation: <input type="number" bind:value={indentation} />
		</label>
	</p>
	<div class="columns">
		<div class="left">
			<p>
				<label>
					<input type="checkbox" bind:checked={showTreeEditor} /> Show editor
				</label>
			</p>
			<div class="editor">
				{#if showTreeEditor}
					<JSONEditor
						bind:json
						indentation={indentation}
					/>
				{/if}
			</div>

			<pre>
				<code>
				{JSON.stringify(json, null, 2)}
				</code>
			</pre>
		</div>
		<div class="right">
			<p>
				<label>
					<input type="checkbox" bind:checked={showCodeEditor} /> Show editor
				</label>
			</p>

			<div class="code-editor">
				{#if showCodeEditor}
					<JSONEditor
						mode="code"
						indentation={indentation}
						bind:text
					/>
				{/if}
			</div>

			<p>
				<button on:click={() => text = '[1, 2, 3, 4]'}>
					Update text
				</button>
			</p>

			<pre>
				<code>
				{text}
				</code>
			</pre>
		</div>
	</div>
</main>

<style>
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 1.5em;
		font-weight: 100;
	}

	.columns {
		display: flex;
		gap: 20px;
	}

	.columns .left,
	.columns .right {
		flex: 1;
	}

	.editor {
		max-width: 600px;
		height: 400px;
	}

	.code-editor {
		max-width: 600px;
		height: 400px;
	}
</style>
