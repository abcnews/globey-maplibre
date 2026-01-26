<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import { mount } from 'svelte';
  import type { Label } from '../../../lib/marker';
  import CustomLabel from './CustomLabel.svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { labels = [] }: { labels?: Label[] } = $props();
  let markers: maplibregl.Marker[] = [];

  $effect(() => {
    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    // Use a local array to track markers created in this effect run
    // cleanup func will remove them.
    // However, if we assign to outer `markers`, we need to be careful.

    const currentMarkers: maplibregl.Marker[] = [];

    if (labels) {
      labels.forEach(label => {
        const el = document.createElement('div');
        mount(CustomLabel, { target: el, props: { name: label.name, style: label.style, pointless: label.pointless } });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat(label.coords)
          .addTo(map);

        currentMarkers.push(marker);
      });
    }

    markers = currentMarkers;

    const updatePositions = () => {
      const container = map.getCanvasContainer();
      if (!container) return;
      const width = container.offsetWidth;

      currentMarkers.forEach(marker => {
        const pos = map.project(marker.getLngLat());
        const el = marker.getElement().querySelector('.globey__label');
        if (el) {
          // Skip flipping for centered labels
          if (el.classList.contains('globey__label--country') || el.classList.contains('globey__label--water')) {
            return;
          }

          // If more than 60% across the screen, flip it to prevent overflow
          if (pos.x > width * 0.6) {
            el.classList.add('globey__domnode--reverse');
          } else {
            el.classList.remove('globey__domnode--reverse');
          }
        }
      });
    };

    map.on('move', updatePositions);
    map.on('moveend', updatePositions);
    map.on('resize', updatePositions);

    requestAnimationFrame(updatePositions);

    return () => {
      map.off('move', updatePositions);
      map.off('moveend', updatePositions);
      map.off('resize', updatePositions);
      currentMarkers.forEach(m => m.remove());
    };
  });
</script>
