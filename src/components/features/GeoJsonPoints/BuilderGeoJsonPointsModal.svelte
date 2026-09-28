<script lang="ts">
  import type { GeoJsonPointsLayer } from '../../../lib/data/jsonBlob.ts';
  import BuilderGeoJsonModal from '../utils/geojson/BuilderGeoJsonModal.svelte';
  import BuilderPropGeoJsonSize from '../utils/geojson/BuilderPropGeoJsonSize.svelte';

  let { config = $bindable(), onclose }: { config: GeoJsonPointsLayer; onclose?: () => void } = $props();
</script>

<BuilderGeoJsonModal bind:config title="Edit GeoJSON points" {onclose}>
  {#snippet kindFields(draft)}
    <BuilderPropGeoJsonSize config={draft} prop="pointSize" legend="Point Size" />
  {/snippet}
</BuilderGeoJsonModal>
