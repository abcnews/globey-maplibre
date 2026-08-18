<script lang="ts">
  import { Marker, type Map } from 'maplibre-gl';
  import { getContext, mount, untrack } from 'svelte';
  import type { Label } from '../../../lib/marker';
  import CustomLabel from './CustomLabel.svelte';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let { labels = [], isDark = false }: { labels?: Label[]; isDark?: boolean } = $props();
  let markers: Marker[] = [];

  const labelsJson = $derived(JSON.stringify(labels));

  $effect(() => {
    labelsJson; // Depend on the stringified labels for deep equality check

    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;

    // Use a local array to track markers created in this effect run
    // cleanup func will remove them.
    const currentMarkers: Marker[] = [];

    // Ensure DOM is ready and labels array is populated
    labels.forEach(label => {
      if (!label.coords) return;

      const el = document.createElement('div');
      el.className = 'custom-label-container';

      try {
        mount(CustomLabel, {
          target: el,
          props: { name: label.name, style: label.style, isDark }
        });

        const marker = new Marker({
          element: el,
          anchor: 'center',
          opacityWhenCovered: 0
        })
          .setLngLat(label.coords)
          .addTo(map);

        currentMarkers.push(marker);
      } catch (e) {
        console.error('Failed to mount label marker', e);
      }
    });

    markers = currentMarkers;

    return () => {
      currentMarkers.forEach(m => m.remove());
    };
  });
</script>
