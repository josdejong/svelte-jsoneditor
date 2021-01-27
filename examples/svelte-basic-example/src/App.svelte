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
</script>

<main>
	<h1>Basic usage of svelte-jsoneditor in a Svelte application</h1>
	<div class="editor">
		<JSONEditor
			bind:json
		/>
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
		height: 400px;
	}
</style>
