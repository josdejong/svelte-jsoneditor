<svelte:options immutable={true} />

<script>
  import { faExclamationTriangle, faAngleDown, faAngleRight } from '@fortawesome/free-solid-svg-icons'
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

  let expanded = true

  function collapse () {
    expanded = false
  }

  function expand () {
    expanded = true
  }

  $: filteredValidationErrors = validationErrorsList.filter(error => !error.isChildError)
</script>

<div class="validation-errors-overview">
  {#if expanded}
    <table>
      <tbody>
        {#each validationErrorsList as validationError, index}
          <tr class="validation-error" on:click={selectError(validationError)}>
            <td class="validation-error-icon">
              <Icon data={faExclamationTriangle} />
            </td>
            <td>
              {stringifyPath(validationError.path)}
            </td>
            <td>
              {validationError.message}
            </td>
            <td class="validation-error-action">
              {#if index === 0}
                <button
                  class="validation-errors-collapse"
                  on:click|stopPropagation={collapse}
                  title="Collapse validation errors"
                >
                  <Icon data={faAngleDown} />
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <table>
      <tbody>
       <tr class="validation-error" on:click={expand}>
         <td class="validation-error-icon">
           <Icon data={faExclamationTriangle} />
         </td>
         <td>
          {validationErrorsList.length} validation errors
           <div class="validation-errors-expand">
             <Icon data={faAngleRight} />
           </div>
        </td>
      </tr>
      </tbody>
    </table>
  {/if}
</div>

<style src="./ValidationErrorsOverview.scss"></style>
