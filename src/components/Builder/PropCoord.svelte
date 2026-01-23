<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  let { map, onchange }: { map: maplibregl.Map } = $props();

  $effect(() => {
    if (!map) {
      return;
    }
    map.on('moveend', e => {
      // Only update coord after the user is finished with it, otherwise we'll
      // clobber their events and the map won't move.
      if (e.originalEvent) {
        return;
      }

      const center = e.target.getCenter();
      $options = {
        ...$options,
        coords: [center.lng, center.lat],
        z: e.target.getZoom()
      };
    });
  });

  function onsubmit(e) {
    // sync value back
  }
</script>

<form {onsubmit}>
  <fieldset>
    <legend>Coord</legend>
    <input type="text" style:width="100%" value={$options?.coords?.map(coord => coord.toFixed(6)).join(',')} />
  </fieldset>
</form>
