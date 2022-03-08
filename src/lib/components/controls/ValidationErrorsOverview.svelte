<svelte:options immutable={true} />

<script>
  import {
    faAngleDown,
    faAngleRight,
    faExclamationTriangle
  } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import { stringifyPath } from '../../utils/pathUtils.js'

  /**
   * @type {ValidationError[]}
   **/
  export let validationErrors

  /**
   * @type {function(error: ValidationError)}
   */
  export let selectError

  let expanded = true

  function collapse() {
    expanded = false
  }

  function expand() {
    expanded = true
  }
</script>

{#if !isEmpty(validationErrors)}
  <div class="validation-errors-overview">
    {#if expanded || validationErrors.length === 1}
      <table>
        <tbody>
          {#each validationErrors as validationError, index}
            <tr
              class="validation-error"
              on:click={() => {
                // trigger on the next tick to prevent the editor not getting focus
                setTimeout(() => selectError(validationError))
              }}
            >
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
                {#if index === 0 && validationErrors.length > 1}
                  <button
                    type="button"
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
              {validationErrors.length} validation errors
              <div class="validation-errors-expand">
                <Icon data={faAngleRight} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    {/if}
  </div>
{/if}

<style src="./ValidationErrorsOverview.scss"></style>
