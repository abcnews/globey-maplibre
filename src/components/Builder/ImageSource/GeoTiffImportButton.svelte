<script lang="ts">
  /**
   * GeoTiffImportButton.svelte
   * Component that allows users to pick or drag & drop a GeoTIFF file
   * to extract its bounding box.
   */
  import * as GeoTIFF from 'geotiff';
  import { parseGeoTiffCoords } from './utils';

  let { onimport }: { onimport: (coords: [number, number][]) => void } = $props();

  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  async function handleFile(file: File) {
    try {
      const tiff = await GeoTIFF.fromBlob(file);
      const image = await tiff.getImage();
      const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
      const geoKeys = image.getGeoKeys();

      const coordinates = parseGeoTiffCoords(bbox, geoKeys);

      if (coordinates) {
        onimport(coordinates);
      } else {
        alert('Could not determine coordinates from the GeoTIFF. It might be missing georeferencing info.');
      }
    } catch (e) {
      console.error('GeoTIFF parsing error:', e);
      alert('Error parsing GeoTIFF file. Ensure it is a valid .tif or .tiff file.');
    }
  }

  function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      handleFile(target.files[0]);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave() {
    isDragging = false;
  }
</script>

<input type="file" accept=".tif,.tiff" style="display: none;" bind:this={fileInput} onchange={onFileChange} />

<button
  type="button"
  class:dragging={isDragging}
  onclick={() => fileInput.click()}
  ondrop={onDrop}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
>
  Import GeoTIFF
</button>

<style>
  button.dragging {
    outline: 2px solid AccentColor;
    outline-offset: -2px;
  }
</style>
