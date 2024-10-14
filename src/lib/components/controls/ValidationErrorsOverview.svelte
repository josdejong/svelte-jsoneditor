<svelte:options immutable={true} />

<script lang="ts">
  import {
    faAngleDown,
    faAngleRight,
    faExclamationTriangle
  } from '@fortawesome/free-solid-svg-icons'
  import { isEmpty } from 'lodash-es'
  import Icon from 'svelte-awesome'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import { ValidationSeverity, type ValidationError } from '$lib/types.js'
  import { MAX_VALIDATION_ERRORS } from '$lib/constants.js'
  import { limit } from '$lib/utils/arrayUtils.js'

  export let validationErrors: ValidationError[]
  export let selectError: (error: ValidationError) => void

  $: count = validationErrors.length

  let expanded = true

  function collapse() {
    expanded = false
  }

  function expand() {
    expanded = true
  }

  function getMaxSeverity(errors: ValidationError[]): ValidationSeverity | undefined {
    const severities = [
      ValidationSeverity.error,
      ValidationSeverity.warning,
      ValidationSeverity.info
    ]

    return severities.find((severity) => errors.some((error) => error.severity === severity))
  }
</script>

{#if !isEmpty(validationErrors)}
  <div class="jse-validation-errors-overview">
    {#if expanded || count === 1}
      <table class="jse-validation-errors-overview-expanded">
        <tbody>
          {#each limit(validationErrors, MAX_VALIDATION_ERRORS) as validationError, index}
            <tr
              class="jse-validation-{validationError.severity}"
              tabindex="0"
              on:click={() => {
                // trigger on the next tick to prevent the editor not getting focus
                setTimeout(() => selectError(validationError))
              }}
            >
              <td class="jse-validation-error-icon">
                <Icon data={faExclamationTriangle} />
              </td>
              <td class="jse-validation-error-path">
                {stringifyJSONPath(validationError.path)}
              </td>
              <td class="jse-validation-error-message">
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

          {#if count > MAX_VALIDATION_ERRORS}
            <tr class="jse-validation-error">
              <td></td>
              <td></td>
              <td>(and {count - MAX_VALIDATION_ERRORS} more errors)</td>
              <td></td>
            </tr>
          {/if}
        </tbody>
      </table>
    {:else}
      <table class="jse-validation-errors-overview-collapsed">
        <tbody>
          <tr class="jse-validation-{getMaxSeverity(validationErrors)}" on:click={expand}>
            <td class="jse-validation-error-icon">
              <Icon data={faExclamationTriangle} />
            </td>
            <td class="jse-validation-error-count">
              {count} validation errors
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
