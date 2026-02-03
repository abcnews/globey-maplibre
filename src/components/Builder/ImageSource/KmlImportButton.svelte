<script lang="ts">
  /**
   * KmlImportButton.svelte
   * Component that triggers a browser prompt to paste KML content
   * and parses it for LatLonBox coordinates.
   */

  import { parseKmlCoords } from './utils';

  let { onimport }: { onimport: (coords: [number, number][]) => void } = $props();

  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      if (content) {
        const coordinates = parseKmlCoords(content);
        if (coordinates) {
          onimport(coordinates);
        } else {
          alert('Could not find valid <north>, <south>, <east>, and <west> tags in the provided KML file.');
        }
      }
    };
    reader.readAsText(file);
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

<input type="file" accept=".kml" style="display: none;" bind:this={fileInput} onchange={onFileChange} />

<button
  type="button"
  class:dragging={isDragging}
  onclick={() => fileInput.click()}
  ondrop={onDrop}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
>
  Import KML
</button>

<style>
  button.dragging {
    outline: 2px solid AccentColor;
    outline-offset: -2px;
  }
</style>
