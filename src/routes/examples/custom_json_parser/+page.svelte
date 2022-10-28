<script>
  import { JSONEditor } from 'svelte-jsoneditor'
  import { parse, stringify } from 'lossless-json'

  const LosslessJSONParser = { parse, stringify }

  let content = {
    text: `{
  "using": "Lossless JSON Parser",
  "formatted number": 4.0,
  "long": 9123372036854000123,
  "large": 1e500,
  "small": 1e-500
}`,
    json: undefined
  }

  $: console.log('contents changed:', content)
</script>

<svelte:head>
  <title>Custom JSON Parser (Lossless JSON) | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom JSON Parser (Lossless JSON)</h1>

<p>
  Instead of using the native <code>JSON</code>
  parser, you can configure a different parser like
  <a target="_blank" href="https://github.com/josdejong/lossless-json" rel="noreferrer"
    >lossless-json</a
  >
  using the option <code>parser</code> in order to be able to handle large numbers like
  <code>long</code> values.
</p>

<div class="editor">
  <JSONEditor bind:content parser={LosslessJSONParser} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }

  code {
    background: rgba(0, 0, 0, 0.1);
    padding: 3px;
  }
</style>
