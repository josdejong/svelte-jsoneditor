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

	let show = true
</script>

<main>
	<h1>Basic usage of svelte-jsoneditor in a Svelte application</h1>
	<p>
		<label>
			<input type="checkbox" bind:checked={show} /> Show editor
		</label>
	</p>
	<div class="editor">
		{#if show}
			<JSONEditor
				bind:json
			/>
		{/if}
	</div>

	<pre>
	  <code>
		{JSON.stringify(json, null, 2)}
  	</code>
  </pre>
</main>

<style>
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 1.5em;
		font-weight: 100;
	}

	.editor {
		max-width: 600px;
		height: 410px;
	}
</style>
