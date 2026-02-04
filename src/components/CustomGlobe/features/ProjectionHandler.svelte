<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';

  let { projection = 'globe' }: { projection?: 'globe' | 'mercator' } = $props();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    // Explicitly read projection at the top of the effect to ensure Svelte 5
    // tracks it as a dependency, especially if we fall into the 'else' block below.
    const currentProjection = projection;

    const applyProjection = () => {
      map.setProjection({
        type: currentProjection
      });
    };

    if (map.isStyleLoaded()) {
      applyProjection();
    } else {
      map.once('styledata', applyProjection);
      return () => map.off('styledata', applyProjection);
    }
  });
</script>
