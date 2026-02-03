<script lang="ts">
  /**
   * NearmapImportButton.svelte
   * Component that triggers a browser prompt to paste a Nearmap URL
   * and calculates the bounding box for image sources.
   */
  import { parseNearmapUrl } from './utils';

  let {
    onimport,
    width = 0,
    height = 0
  }: {
    onimport: (coords: [number, number][]) => void;
    width?: number;
    height?: number;
  } = $props();

  function handleAddNearmap() {
    if (width === 0 || height === 0) {
      alert('Wait for the preview image to load so we can get its dimensions, or ensure the URL is correct.');
      return;
    }

    const input = prompt(
      `Paste a Nearmap URL (e.g. https://apps.nearmap.com/maps/#/@-27.48,153.00,18.00z,0d/...)\n\nWe will calculate coordinates based on image dimensions: ${width}x${height} px`
    );

    if (input === null || input.trim() === '') return; // User cancelled or empty

    const result = parseNearmapUrl(input, width, height);

    if (result) {
      if (result.pitch > 0) {
        alert(
          'Warning: This Nearmap view is tilted (pitch: ' +
            result.pitch +
            '°).\n\nCoordinates calculated from tilted views may be inaccurate. For best results, use a top-down view (0° pitch) in Nearmap.'
        );
      }
      onimport(result.coordinates);
    } else {
      alert('Could not find valid coordinates and zoom level in the provided Nearmap URL.');
    }
  }
</script>

<button type="button" onclick={handleAddNearmap}>Paste from Nearmap</button>

<style>
</style>
