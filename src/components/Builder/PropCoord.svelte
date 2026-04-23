<script lang="ts">
  import { untrack } from 'svelte';
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  import PropBounds from './PropBounds.svelte';
  import GeoSearch from './GeoSearch/GeoSearch.svelte';
  import { QuestionCircle } from 'svelte-bootstrap-icons';

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

  type NavMode = 'pan-zoom' | 'fit-globe' | 'fit-bounds';

  /**
   * Explicit navigation mode state. This acts as the source of truth for the UI
   * and is initialised from the current store options.
   */
  let navMode = $state<NavMode>(
    $options.fitGlobe ? 'fit-globe' : hasBounds ? 'fit-bounds' : 'pan-zoom'
  );

  /**
   * Transitions between navigation modes and updates the store accordingly.
   * This handles the side effects of clearing bounds or enabling globe fitting.
   *
   * @param mode - The target navigation mode.
   */
  function setNavMode(mode: NavMode) {
    navMode = mode;

    if (mode === 'fit-globe') {
      $options = { ...$options, fitGlobe: true, bounds: [] };
      onFitGlobeChange?.(true);
      onBoundsChange?.([]);
    } else if (mode === 'fit-bounds') {
      $options = { ...$options, fitGlobe: false };
      onFitGlobeChange?.(false);
      // Note: We don't clear bounds here so users can switch into fit-bounds and keep their points.
    } else {
      $options = { ...$options, fitGlobe: false, bounds: [] };
      onFitGlobeChange?.(false);
      onBoundsChange?.([]);
    }
  }

  // Sync navMode if options change externally (e.g. from a preset or reset)
  $effect(() => {
    if ($options.fitGlobe) {
      navMode = 'fit-globe';
    } else if (hasBounds) {
      navMode = 'fit-bounds';
    }
  });

  function onGeoSelect(result: { name: string; coords: [number, number] }) {
    // Zoom to location (zoom level 10 is usually a good city-level view as a starter)
    update(result.coords, 10, true);

    // Clear bounds as requested
    $options = {
      ...$options,
      bounds: []
    };
    onBoundsChange?.([]);

    // Switch to pan-zoom mode UI
    navMode = 'pan-zoom';
  }

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
    if (!map || navMode !== 'pan-zoom') {
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

      // Heuristic: swap if it looks like lat,lng
      if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
        return { coords: [b, a] };
      }
      if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
        return { coords: [a, b] };
      }

      return { coords: [a, b] };
    }

    return null;
  }

  /**
   * Update store, map, and call onchange
   */
  function update(coords: [number, number], z?: number, smooth = false) {
    const newZ = z ?? $options.z;

    const dLng = Math.abs(($options.coords?.[0] ?? 0) - coords[0]);
    const dLat = Math.abs(($options.coords?.[1] ?? 0) - coords[1]);
    const dZ = Math.abs(($options.z ?? 0) - (newZ ?? 0));

    if (dLng < 0.000001 && dLat < 0.000001 && dZ < 0.001) {
      return;
    }

    if (!smooth) {
      $disableMapAnimation = true;
    }

    $options = {
      ...$options,
      coords,
      z: newZ
    };
    onchange?.(coords, newZ);

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
    <legend>
      Positioning
      <button
        class="btn-icon"
        type="button"
        aria-label="Help"
        title="Help"
        onclick={() =>
          window.open(
            'https://loop.cloud.microsoft/p/eyJ3Ijp7InUiOiJodHRwczovL2FiY3BvcnRhbC5zaGFyZXBvaW50LmNvbS8%2FbmF2PWN6MGxNa1ltWkQxaUlWWlNNMGd0UVZOc2FHdFhjRzlCTUVKMWVITTNXV3czWDJ4aVUyNXRZMFpNYURCa1JXOXRkelppU0RSb2VXeEVVbTlvUjFSUmNrbHhZaTE0ZURGelRta21aajB3TVV4TlJWWlpRakkxVlU5UFJVUklSVU5CVWtoWlFVTXpSemRKVGtKRlV6Tk5KbU05Sm1ac2RXbGtQVEUlM0QiLCJyIjpmYWxzZX0sInAiOnsidSI6Imh0dHBzOi8vYWJjcG9ydGFsLnNoYXJlcG9pbnQuY29tLzpmbDovci9jb250ZW50c3RvcmFnZS9DU1BfZjhjNzFkNTUtYTUwNC00NTg2LWE5YTAtMGQwMWJiMWIzYjYyL0RvY3VtZW50JTIwTGlicmFyeS9Mb29wQXBwRGF0YS9VbnRpdGxlZC5sb29wP2Q9dzY1YTQ2YzA3ZGI4MjQ2NjhiMzQwYzAzNWJmOTNmY2I4JmNzZj0xJndlYj0xJm5hdj1jejBsTWtaamIyNTBaVzUwYzNSdmNtRm5aU1V5UmtOVFVGOW1PR00zTVdRMU5TMWhOVEEwTFRRMU9EWXRZVGxoTUMwd1pEQXhZbUl4WWpOaU5qSW1aRDFpSVZaU00wZ3RRVk5zYUd0WGNHOUJNRUoxZUhNM1dXdzNYMnhpVTI1dFkwWk1hREJrUlc5dGR6WmlTRFJvZVd4RVVtOW9SMVJSY2tseFlpMTRlREZ6VG1rbVpqMHdNVXhOUlZaWlFsbElUbE5UUjB4QlZ6Tk9Ra1JNUjFGSFFVZFhOMXBJTjBaWkptTTlKVEpHSm1ac2RXbGtQVEVtWVQxTWIyOXdRWEJ3Sm5BOUpUUXdabXgxYVdSNEpUSkdiRzl2Y0Mxd1lXZGxMV052Ym5SaGFXNWxjaVo0UFNVM1FpVXlNbmNsTWpJbE0wRWxNakpVTUZKVVZVaDRhRmx0VG5kaU0wb3dXVmQzZFdNeWFHaGpiVlozWWpKc2RXUkROV3BpTWpFNFdXbEdWMVZxVGtsTVZVWlVZa2RvY2xZelFuWlJWRUpEWkZob2VrNHhiSE5PTVRseldXeE9kV0pYVGtkVVIyZDNXa1ZXZG1KWVl6SlphMmN3WVVoc2MxSkdTblpoUldSVlZWaEtTbU5YU1hSbFNHZDRZekExY0daRVFYaFVSVEZHVm14c1EwMXFWbFpVTURsR1VrVm9SbEV3UmxOVFJteENVWHBPU0U0d2JFOVJhMVpVVFRBd0pUTkVKVEl5SlRKREpUSXlhU1V5TWlVelFTVXlNbVk1TldaaE1tWTNMVFF6T0dRdE5ETTNaQzA0WmpsaExXTXhNelF5TXpNNFltTmlPQ1V5TWlVM1JBJTNEJTNEIiwiciI6ZmFsc2V9LCJpIjp7ImkiOiJmOTVmYTJmNy00MzhkLTQzN2QtOGY5YS1jMTM0MjMzOGJjYjgifX0%3D'
          )
        }
      >
        <QuestionCircle />
      </button>
    </legend>

    <div style:display="flex" style:gap="0.5rem" style:align-items="center" style:margin-bottom="0.5rem">
      <input
        type="text"
        style:flex="1"
        bind:this={inputElement}
        bind:value={inputValue}
        {onpaste}
        placeholder="Paste lat,lng or Google Maps URL"
      />
      <GeoSearch onselect={onGeoSelect} />
    </div>

    <select
      style:width="100%"
      style:margin-bottom="0.5rem"
      value={navMode}
      onchange={e => setNavMode(e.currentTarget.value as NavMode)}
    >
      <option value="pan-zoom">Pan and zoom to coord</option>
      <option value="fit-globe">Fit globe to screen</option>
      <option value="fit-bounds">Fit bounds</option>
    </select>

    {#if navMode === 'pan-zoom'}

      <div class="coord-grid">
        <label for="zoom-slider">Zoom</label>
        <input
          id="zoom-slider"
          type="range"
          min="-1"
          max="13"
          step="0.1"
          value={$options?.z ?? 3}
          oninput={e => update($options.coords!, parseFloat(e.currentTarget.value))}
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
          onmousedown={() => ($disableMapAnimation = true)}
          onmouseup={() => ($disableMapAnimation = false)}
        />
        <span class="value">{$options?.coords?.[1]?.toFixed(1) ?? '0.0'}</span>
      </div>

      <small style:display="block" style:margin-top="0.5rem" style:color="var(--text-light)">
        This is best used for exploring the builder. Fit bounds or fit globe work better to handle all the various
        screen sizes.
      </small>
    {:else if navMode === 'fit-globe'}
      <p style:margin="0" style:font-size="0.9rem" style:color="var(--text-light)">
        The map will automatically zoom to fit the full globe circle in the viewport.
      </p>
    {:else if navMode === 'fit-bounds'}
      <PropBounds {map} onchange={onBoundsChange} {onFitGlobeChange} />
    {/if}
  </fieldset>
</form>

<style>
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .coord-grid {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.5rem;
  }

  .coord-grid label {
    font-size: 0.9rem;
    color: var(--text-light);
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
