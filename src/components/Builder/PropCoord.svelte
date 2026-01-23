<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';

  let {
    map,
    onchange
  }: {
    map: maplibregl.Map;
    onchange?: (coords: [number, number]) => void;
  } = $props();

  let inputValue = $state('');
  let inputElement: HTMLInputElement | undefined = $state();

  // Sync store -> input
  $effect(() => {
    const coords = $options?.coords;
    if (!coords) return;

    const formatted = coords.map(coord => coord.toFixed(6)).join(',');

    // Only update if not focused to avoid jumping while typing
    if (document.activeElement !== inputElement) {
      inputValue = formatted;
    }
  });

  // Sync map -> store
  $effect(() => {
    if (!map) {
      return;
    }

    const handler = (e: any) => {
      // Only update coord after the user is finished with it (user interaction)
      if (!e.originalEvent) {
        return;
      }

      const center = e.target.getCenter();
      const newCoords: [number, number] = [center.lng, center.lat];
      $options = {
        ...$options,
        coords: newCoords,
        z: e.target.getZoom()
      };
      onchange?.(newCoords);
    };

    map.on('moveend', handler);
    return () => map.off('moveend', handler);
  });

  /**
   * Parse input text for coordinates or Google Maps links
   */
  function parseInput(text: string): { coords: [number, number]; z?: number } | null {
    // Google Maps URL
    // Matches @lat,lng,zoomz or @lat,lng
    const gmapsMatch = text.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,(\d+\.?\d*)z)?/);
    if (gmapsMatch) {
      return {
        coords: [Number(gmapsMatch[2]), Number(gmapsMatch[1])],
        z: gmapsMatch[3] ? Number(gmapsMatch[3]) : undefined
      };
    }

    // Plain coordinates "lat, lng" or "lng, lat"
    const coordsMatch = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (coordsMatch) {
      const a = Number(coordsMatch[1]);
      const b = Number(coordsMatch[2]);

      // Heuristic: if it looks like lat,lng (first is lat), swap it to lng,lat
      // Google Maps "Copy coordinates" gives "lat, lng"
      if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
        return { coords: [b, a] };
      }
      if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
        return { coords: [a, b] };
      }

      // Default to lng,lat (as displayed in input)
      return { coords: [a, b] };
    }

    return null;
  }

  /**
   * Update store, map, and call onchange
   */
  function update(coords: [number, number], z?: number) {
    $options = {
      ...$options,
      coords,
      z: z ?? $options.z
    };
    onchange?.(coords);

    if (map) {
      map.setCenter(coords);
      if (z !== undefined) {
        map.setZoom(z);
      }
    }
  }

  function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = parseInput(inputValue);
    if (result) {
      update(result.coords, result.z);
      // Blur to trigger the effect and sync the formatted value back
      inputElement?.blur();
    }
  }

  function onpaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text');
    if (!text) {
      return;
    }

    const result = parseInput(text);
    if (result) {
      e.preventDefault();
      update(result.coords, result.z);
      // Blur to trigger the effect and sync the formatted value back
      inputElement?.blur();
    }
  }
</script>

<form {onsubmit}>
  <fieldset>
    <legend>Coord</legend>
    <small style:display="block" style:margin-bottom="0.5rem">
      Paste a Google Maps link or coordinates (lat, lng)
    </small>
    <input type="text" style:width="100%" bind:this={inputElement} bind:value={inputValue} {onpaste} />
  </fieldset>
</form>
