<script lang="ts">
  import type { GeoJsonColourConfig } from '../../../../lib/data/jsonBlob.ts';
  import { paletteGradient } from './palette.ts';

  interface Props {
    colourConfig?: GeoJsonColourConfig;
    /** Number of stepped classes; unset = continuous */
    classes?: number;
  }

  let { colourConfig, classes }: Props = $props();

  let previewGradient = $derived(paletteGradient(colourConfig, classes));
</script>

{#if previewGradient}
  <div class="colorbar" style:background={previewGradient}></div>
  {#if colourConfig?.min !== undefined && colourConfig?.max !== undefined}
    <div class="labels">
      <span>{colourConfig.min}</span>
      <span>{colourConfig.max}</span>
    </div>
  {/if}
{/if}

<style>
  .colorbar {
    height: 1.5rem;
    width: 100%;
    margin-top: 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
  }
  .labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }
</style>
