<svelte:options immutable={true} />

<script lang="ts">
  import {
    faAngleDown,
    faAngleRight,
    faExclamationTriangle
  } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import { stringifyJSONPath } from '../../utils/pathUtils.js'
  import type { ValidationError } from '../../types'
  import { stripRootObject } from '$lib/utils/pathUtils.js'

  export let validationErrors: ValidationError[]
  export let selectError: (error: ValidationError) => void

  let expanded = true

  function collapse() {
    expanded = false
  }

  function expand() {
    expanded = true
  }
</script>

{#if !isEmpty(validationErrors)}
  <div class="jse-validation-errors-overview">
    {#if expanded || validationErrors.length === 1}
      <table>
        <tbody>
          {#each validationErrors as validationError, index}
            <tr
              class="jse-validation-error"
              on:click={() => {
                // trigger on the next tick to prevent the editor not getting focus
                setTimeout(() => selectError(validationError))
              }}
            >
              <td class="jse-validation-error-icon">
                <Icon data={faExclamationTriangle} />
              </td>
              <td>
                {stripRootObject(stringifyJSONPath(validationError.path))}
              </td>
              <td>
                {validationError.message}
              </td>
              <td class="jse-validation-error-action">
                {#if index === 0 && validationErrors.length > 1}
                  <button
                    type="button"
                    class="jse-validation-errors-collapse"
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
          <tr class="jse-validation-error" on:click={expand}>
            <td class="jse-validation-error-icon">
              <Icon data={faExclamationTriangle} />
            </td>
            <td>
              {validationErrors.length} validation errors
              <div class="jse-validation-errors-expand">
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
