<script lang="ts">
  interface Props {
    onclick?: () => void
    children?: () => unknown
  }

  const { onclick, children }: Props = $props()

  const handleClick = $derived.by(() => {
    return onclick
      ? (event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
          onclick()
        }
      : undefined
  })
</script>

<button type="button" class="jse-tag" onclick={handleClick} disabled={!onclick}>
  {@render children?.()}
</button>

<style lang="scss">
  @use '../../styles';
  @use '../../themes/defaults';

  .jse-tag {
    border: none;
    font-size: 80%;
    font-family: defaults.$font-family;
    color: defaults.$tag-color;
    background: defaults.$tag-background;
    border-radius: 2px;
    cursor: pointer;
    //position: relative;
    display: inline-block;
    padding: 0 4px;
    line-height: normal;
    margin: 1px 0;

    &:hover {
      opacity: 0.8;
    }

    &:disabled {
      opacity: 0.7;
      cursor: inherit;
    }
  }
</style>
