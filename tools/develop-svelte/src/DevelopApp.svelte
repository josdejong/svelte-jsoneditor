<script>
	import { JSONEditor, createAjvValidator } from 'svelte-jsoneditor'

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

	const schema = {
		"title": "Employee",
		"description": "Object containing employee details",
		"type": "object",
		"properties": {
			"boolean": {
				"title": "A boolean",
				"type": "boolean"
			},
			"array": {
				"items": {
					"type": "number",
					"minimum": 10
				}
			}
		},
		"required": ["foo"]
	}

	const validator = createAjvValidator(schema)

	let text = undefined

	let showTreeEditor = true
	let showCodeEditor = true
	let indentation = 2
	let height = '400px'
	let validate = false

	function onRenderMenu(mode, items) {
		console.log('onRenderMenu', mode, items)
	}

	function onChange({ json, text }) {
		console.log('onChange', { json, text })
	}

	function onChangeMode(mode) {
		console.log('onChangeMode', mode)
	}
</script>

<main>
	<h1>svelte-jsoneditor development application</h1>
	<p>
		<label>
			Indentation: <input type="number" bind:value={indentation} />
		</label>
		<label>
			Height: <input type="text" bind:value={height} />
		</label>
		<label>
			<input type="checkbox" bind:checked={validate} /> Validate
		</label>
	</p>
	<p>
		<button on:click={() => {
					text = undefined
					json = [1, 2, 3, 4, 5]
				}}>
			Update json
		</button>
		<button on:click={() => {
					text = '[1, 2, 3, 4]'
					json = undefined
				}}>
			Update text
		</button>
		<button on:click={() => {
			text = '[1, 2, 3, 4}'
			json = undefined
		}}>
			Update text (invalid)
		</button>
	</p>
	<div class="columns">
		<div class="left">
			<p>
				<label>
					<input type="checkbox" bind:checked={showTreeEditor} /> Show tree editor
				</label>
			</p>
			<div class="editor" style="height: {height}">
				{#if showTreeEditor}
					<JSONEditor
						bind:text
						bind:json
						indentation={indentation}
						validator={validate ? validator : undefined}
						onRenderMenu={onRenderMenu}
						onChange={onChange}
						onChangeMode={onChangeMode}
					/>
				{/if}
			</div>

			<div class="data">
				json contents:
				<pre>
					<code>
					{json !== undefined ? JSON.stringify(json, null, 2) : 'undefined'}
					</code>
				</pre>
			</div>
		</div>
		<div class="right">
			<p>
				<label>
					<input type="checkbox" bind:checked={showCodeEditor} /> Show code editor
				</label>
			</p>

			<div class="code-editor" style="height: {height}">
				{#if showCodeEditor}
					<JSONEditor
						mode="code"
						bind:text
						bind:json
						indentation={indentation}
						validator={validate ? validator : undefined}
						onRenderMenu={onRenderMenu}
						onChange={onChange}
						onChangeMode={onChangeMode}
					/>
				{/if}
			</div>
			<div class="data">
				text contents:
				<pre>
					<code>
					{text}
					</code>
				</pre>
			</div>
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
		max-width: 800px;
		height: 400px;
	}

	.code-editor {
		max-width: 800px;
		height: 400px;
	}

	.data {
		margin-top: 10px;
	}

	pre {
		background: #f5f5f5;
	}
</style>
