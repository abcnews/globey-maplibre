<script lang="ts">
  /**
   * NearmapImportButton.svelte
   * Component that triggers a browser prompt to paste a Nearmap URL
   * and calculates the bounding box for image sources.
   */
  import { parseNearmapUrl } from './utils';

  let { onimport }: { onimport: (coords: [number, number][]) => void } = $props();

  function handleAddNearmap() {
    const input = prompt(
      'Paste a Nearmap URL (e.g. https://apps.nearmap.com/maps/#/@-27.48,153.00,18.00z,0d/...)\n\nNote: Calculating from URL assumes a standard 1920x1080 view.'
    );

    if (input === null || input.trim() === '') return; // User cancelled or empty

    const result = parseNearmapUrl(input);

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
