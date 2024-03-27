<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  /**
   * rules:
   * - team, names, and ages must be filled in and be of correct type
   * - a team must have 4 members
   * - at lease one member of the team must be adult
   */
  function customValidator(json) {
    const errors = []

    if (json && Array.isArray(json.team)) {
      // check whether each team member has name and age filled in correctly
      json.team.forEach(function (member, index) {
        if (member && typeof member === 'object') {
          if ('name' in member) {
            if (typeof member.name !== 'string') {
              errors.push({
                path: ['team', index, 'name'],
                message: 'Name must be a string',
                severity: 'warning'
              })
            }
          } else {
            errors.push({
              path: ['team', index],
              message: 'Required property "name"" missing',
              severity: 'warning'
            })
          }

          if ('age' in member) {
            if (typeof member.age !== 'number') {
              errors.push({
                path: ['team', index, 'age'],
                message: 'Age must be a number',
                severity: 'warning'
              })
            }
          } else {
            errors.push({
              path: ['team', index],
              message: 'Required property "age" missing',
              severity: 'warning'
            })
          }
        } else {
          errors.push({
            path: ['team', index],
            message: 'Member must be an object with properties "name" and "age"',
            severity: 'warning'
          })
        }
      })

      // check whether the team consists of exactly four members
      if (json.team.length !== 4) {
        errors.push({ path: ['team'], message: 'A team must have 4 members', severity: 'error' })
      }

      // check whether there is at least one adult member in the team
      const adults = json.team.filter(function (member) {
        return member ? member.age >= 18 : false
      })
      if (adults.length === 0) {
        errors.push({
          path: ['team'],
          message: 'A team must have at least one adult person (age >= 18)',
          severity: 'info'
        })
      }
    } else {
      errors.push({
        path: [],
        message: 'Required property "team" missing or not an Array',
        severity: 'warning'
      })
    }

    return errors
  }

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      team: [
        {
          name: 'Joe',
          age: 17
        },
        {
          name: 'Sarah',
          age: 13
        },
        {
          name: 'Jack'
        }
      ]
    }
  }
</script>

<svelte:head>
  <title>Custom validation | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom validation</h1>

<p>This example demonstrates how to run custom validation on a JSON object.</p>

<p>The validation rules in this example are:</p>
<ul>
  <li>team, names, and ages must be filled in and be of correct type</li>
  <li>a team must have 4 members</li>
  <li>at lease one member of the team must be adult</li>
</ul>

<div class="editor">
  <JSONEditor bind:content validator={customValidator} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
