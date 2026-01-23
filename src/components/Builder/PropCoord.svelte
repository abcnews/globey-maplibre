<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  let { map }: { map: maplibregl.Map } = $props();

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
</script>

<fieldset>
  <legend>Coord</legend>
  <input type="text" style:width="100%" value={$options?.coord?.join(',')} />
</fieldset>
