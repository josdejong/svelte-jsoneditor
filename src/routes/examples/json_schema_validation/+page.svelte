<script>
  import {
    JSONEditor,
    createAjvValidator,
    renderValue,
    renderJSONSchemaEnum
  } from 'svelte-jsoneditor'

  const schema = {
    title: 'Employee',
    description: 'Object containing employee details',
    type: 'object',
    properties: {
      firstName: {
        title: 'First Name',
        description: 'The given name.',
        examples: ['John'],
        type: 'string'
      },
      lastName: {
        title: 'Last Name',
        description: 'The family name.',
        examples: ['Smith'],
        type: 'string'
      },
      gender: {
        title: 'Gender',
        enum: ['male', 'female']
      },
      availableToHire: {
        type: 'boolean',
        default: false
      },
      age: {
        description: 'Age in years',
        type: 'integer',
        minimum: 0,
        examples: [28, 32]
      },
      job: {
        $ref: 'job'
      }
    },
    required: ['firstName', 'lastName']
  }

  const schemaDefinitions = {
    job: {
      title: 'Job description',
      type: 'object',
      required: ['address'],
      properties: {
        company: {
          type: 'string',
          examples: ['ACME', 'Dexter Industries']
        },
        role: {
          description: 'Job title.',
          type: 'string',
          examples: ['Human Resources Coordinator', 'Software Developer'],
          default: 'Software Developer'
        },
        address: {
          type: 'string'
        },
        salary: {
          type: 'number',
          minimum: 120,
          examples: [100, 110, 120]
        }
      }
    }
  }

  // create a JSON schema validator powered by Ajv
  const validator = createAjvValidator({ schema, schemaDefinitions })

  // enable rendering a select box for enums
  function onRenderValue(props) {
    return renderJSONSchemaEnum(props, schema, schemaDefinitions) || renderValue(props)
  }

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      firstName: 'John',
      lastName: 'Doe',
      gender: null,
      age: '28',
      availableToHire: true,
      job: {
        company: 'freelance',
        role: 'developer',
        salary: 100
      }
    }
  }
</script>

<svelte:head>
  <title>JSON Schema validation | svelte-jsoneditor</title>
</svelte:head>

<h1>JSON Schema validation</h1>

<p>
  This example demonstrates JSON schema validation. The JSON object in this example must contain
  properties like <code>firstName</code> and <code>lastName</code>, can can optionally have a
  property <code>age</code> which must be a positive integer.
</p>
<p>
  See <a href="https://json-schema.org/" target="_blank" rel="noreferrer"
    >https://json-schema.org/</a
  > for more information.
</p>

<div class="editor">
  <JSONEditor bind:content {validator} {onRenderValue} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
