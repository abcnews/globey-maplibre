<script lang="ts">
  import type { maplibregl } from '../mapLibre/index';

  let {
    map,
    onchange
  }: {
    map: maplibregl.Map;
    onchange?: (coords: [number, number]) => void;
  } = $props();

  function setLocation(coords: [number, number], zoom: number) {
    if (map) {
      map.flyTo({
        center: coords,
        zoom: zoom
      });
    }
    onchange?.(coords);
  }
</script>

<fieldset>
  <legend>Presets</legend>
  <div class="buttons">
    <button onclick={() => setLocation([0, 90], -1)}>North Pole</button>
    <button onclick={() => setLocation([0, -90], -1)}>South Pole</button>
  </div>
</fieldset>

<style>
  .buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  button {
    cursor: pointer;
  }
</style>
