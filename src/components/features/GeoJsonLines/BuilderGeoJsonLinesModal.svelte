<script lang="ts">
  import type { GeoJsonLinesLayer } from '../../../lib/data/jsonBlob.ts';
  import BuilderGeoJsonModal from '../utils/geojson/BuilderGeoJsonModal.svelte';
  import BuilderPropGeoJsonSize from '../utils/geojson/BuilderPropGeoJsonSize.svelte';

  let { config = $bindable(), onclose }: { config: GeoJsonLinesLayer; onclose?: () => void } = $props();
</script>

<BuilderGeoJsonModal bind:config title="Edit GeoJSON lines" {onclose}>
  {#snippet kindFields(draft)}
    <BuilderPropGeoJsonSize config={draft} prop="lineWidth" legend="Line Width" />

    <fieldset>
      <legend>Reveal Animation</legend>
      <div class="options">
        <label>
          <input
            type="radio"
            name="gj-line-anim"
            value="fade"
            checked={draft.lineAnimationStyle === 'fade'}
            onchange={() => (draft.lineAnimationStyle = 'fade')}
          />
          Fade in
        </label>
        <label>
          <input
            type="radio"
            name="gj-line-anim"
            value="draw"
            checked={draft.lineAnimationStyle === 'draw'}
            onchange={() => (draft.lineAnimationStyle = 'draw')}
          />
          Draw on
        </label>
      </div>
    </fieldset>
  {/snippet}
</BuilderGeoJsonModal>

<style>
  .options {
    display: flex;
    gap: 1rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
</style>
