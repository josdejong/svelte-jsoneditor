<svelte:options immutable={true} />

<script>
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { stringifyPath } from '../../utils/pathUtils.js'

  /**
   * @type {ValidationError[]}
   **/
  export let validationErrorsList

  /**
   * @type {function(error: ValidationError)}
   */
  export let selectError

  $: filteredValidationErrors = validationErrorsList.filter(error => !error.isChildError)
</script>

<div class="validation-errors-overview">
  <table>
    <tbody>
      {#each validationErrorsList as validationError}
        <tr class="validation-error" on:click={selectError(validationError)}>
          <td>
            <Icon data={faExclamationTriangle} />
          </td>
          <td>
            {stringifyPath(validationError.path)}</td>
          <td>
            {validationError.message}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style src="./ValidationErrorsOverview.scss"></style>
