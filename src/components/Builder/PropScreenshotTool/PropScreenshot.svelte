<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';

  let { map, options = $bindable() }: { map: maplibregl.Map; options: DecodedObject } = $props();

  async function takeScreenshot() {
    if (!map) {
      console.error('Map not initialized');
      return;
    }

    alert(
      'This feature does not screenshot all the map features, such as custom labels, attribution etc. It is not suitable as a fallback image.'
    );

    const projection = map.getProjection();
    if (projection && projection.type === 'globe') {
      const shouldSwitch = confirm(
        'Switch to 2D map?\n\nThis is highly recommended if you intend to use this as georectified imagery. 2D mode ensures the linear geographic bounds match the image corners exactly.'
      );
      if (shouldSwitch) {
        options.projection = 'mercator';
        // Wait for the next idle event after the projection change
        console.log('Switching to mercator, waiting for map to settle...');
        await new Promise(resolve => map.once('idle', resolve));
      }
    }

    capture();
  }

  function capture() {
    console.log('Taking screenshot, waiting for idle...');

    // Trigger a repaint and wait for idle to ensure the buffer is populated
    map.triggerRepaint();
    map.once('idle', () => {
      console.log('Map idle, capturing canvas...');
      const canvas = map.getCanvas();
      const bounds = map.getBounds();

      // Bound order: top, left, bottom, right (N, W, S, E)
      const top = bounds.getNorth().toFixed(6);
      const left = bounds.getWest().toFixed(6);
      const bottom = bounds.getSouth().toFixed(6);
      const right = bounds.getEast().toFixed(6);

      const filename = `builder.${top},${left},${bottom},${right}.png`;

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }
        console.log('Blob created, downloading:', filename);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }
</script>

<button onclick={takeScreenshot}>Take Screenshot...</button>
