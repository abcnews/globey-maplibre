<script lang="ts">
  import type { GeoJsonAreasLayer } from '../../../lib/data/jsonBlob.ts';
  import BuilderGeoJsonModal from '../utils/geojson/BuilderGeoJsonModal.svelte';

  let { config = $bindable(), onclose }: { config: GeoJsonAreasLayer; onclose?: () => void } = $props();
</script>

<BuilderGeoJsonModal bind:config title="Edit GeoJSON areas" {onclose} />
