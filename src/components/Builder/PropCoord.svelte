<script lang="ts">
  import { untrack } from 'svelte';
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  import PropBounds from './PropBounds.svelte';

  import { disableMapAnimation } from '../../lib/stores';

  let {
    map,
    onchange,
    onBoundsChange,
    onFitGlobeChange
  }: {
    map: maplibregl.Map;
    onchange?: (coords: [number, number], z?: number) => void;
    onBoundsChange?: (bounds: [number, number][]) => void;
    onFitGlobeChange?: (fitGlobe: boolean) => void;
  } = $props();

  let inputValue = $state('');
  let inputElement: HTMLInputElement | undefined = $state();

  const hasBounds = $derived(($options?.bounds?.length ?? 0) > 0);

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
    if (!map || hasBounds) {
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
      onchange?.(newCoords, e.target.getZoom());
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
  function update(coords: [number, number], z?: number, smooth = false) {
    const newZ = z ?? $options.z;

    // Guard: check if anything has actually changed meaningfully
    const dLng = Math.abs(($options.coords?.[0] ?? 0) - coords[0]);
    const dLat = Math.abs(($options.coords?.[1] ?? 0) - coords[1]);
    const dZ = Math.abs(($options.z ?? 0) - (newZ ?? 0));

    if (dLng < 0.000001 && dLat < 0.000001 && dZ < 0.001) {
      return;
    }

    // Disable animation for this update unless explicitly smooth
    if (!smooth) {
      $disableMapAnimation = true;
    }

    $options = {
      ...$options,
      coords,
      z: newZ
    };
    onchange?.(coords, newZ);

    // Re-enable animation in the next tick
    if (!smooth) {
      setTimeout(() => {
        $disableMapAnimation = false;
      }, 0);
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

  function updateLng(lng: number) {
    const currentLat = map?.getCenter().lat ?? $options.coords?.[1] ?? 0;
    update([lng, currentLat]);
  }

  function updateLat(lat: number) {
    const currentLng = map?.getCenter().lng ?? $options.coords?.[0] ?? 0;
    update([currentLng, lat]);
  }
</script>

<form {onsubmit}>
  <fieldset>
    <legend>Coord</legend>

    <input type="text" style:width="100%" bind:this={inputElement} bind:value={inputValue} {onpaste} />

    <details>
      <summary>Advanced</summary>

      <hr />

      <label for="fit-globe-checkbox">
        <input
          type="checkbox"
          id="fit-globe-checkbox"
          bind:checked={$options.fitGlobe}
          onchange={() => {
            onFitGlobeChange?.(!!$options.fitGlobe);
            if ($options.fitGlobe) {
              $options = {
                ...$options,
                bounds: []
              };
              onBoundsChange?.([]);
            }
          }}
        /> Fit globe to screen
      </label>

      <div class="coord-grid">
        <label for="zoom-slider">Zoom</label>
        <input
          id="zoom-slider"
          type="range"
          min="-1"
          max="13"
          step="0.1"
          disabled={$options.fitGlobe}
          value={$options?.z ?? 3}
          oninput={e => update($options.coords!, parseFloat(e.currentTarget.value))}
          aria-valuemin={-1}
          aria-valuemax={13}
          aria-valuenow={$options?.z ?? 3}
          onmousedown={() => ($disableMapAnimation = true)}
          onmouseup={() => ($disableMapAnimation = false)}
        />
        <span class="value">{$options?.z?.toFixed(1) ?? '3.0'}</span>

        <label for="lng-slider">Lng</label>
        <input
          id="lng-slider"
          type="range"
          min="-180"
          max="180"
          step="0.1"
          value={$options?.coords?.[0] ?? 0}
          oninput={e => updateLng(parseFloat(e.currentTarget.value))}
          aria-valuemin={-180}
          aria-valuemax={180}
          aria-valuenow={$options?.coords?.[0] ?? 0}
          onmousedown={() => ($disableMapAnimation = true)}
          onmouseup={() => ($disableMapAnimation = false)}
        />
        <span class="value">{$options?.coords?.[0]?.toFixed(1) ?? '0.0'}</span>

        <label for="lat-slider">Lat</label>
        <input
          id="lat-slider"
          type="range"
          min="-90"
          max="90"
          step="0.1"
          value={$options?.coords?.[1] ?? 0}
          oninput={e => updateLat(parseFloat(e.currentTarget.value))}
          aria-valuemin={-90}
          aria-valuemax={90}
          aria-valuenow={$options?.coords?.[1] ?? 0}
          onmousedown={() => ($disableMapAnimation = true)}
          onmouseup={() => ($disableMapAnimation = false)}
        />
        <span class="value">{$options?.coords?.[1]?.toFixed(1) ?? '0.0'}</span>
      </div>

      <hr />

      <PropBounds {map} onchange={onBoundsChange} {onFitGlobeChange} />
    </details>
  </fieldset>
</form>

<style>
  .coord-grid {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.5rem;
  }

  .coord-grid label {
    font-size: 0.9rem;
    color: #666;
  }

  .coord-grid input[type='range'] {
    width: 100%;
  }

  .coord-grid .value {
    font-family: monospace;
    font-size: 0.9rem;
    width: 5ch;
    text-align: right;
  }
</style>
