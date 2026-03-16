<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext, mount, untrack } from 'svelte';
  import type { Label } from '../../../lib/marker';
  import CustomLabel from './CustomLabel.svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { labels = [], isDark = false }: { labels?: Label[]; isDark?: boolean } = $props();
  let markers: maplibregl.Marker[] = [];

  const labelsJson = $derived(JSON.stringify(labels));

  $effect(() => {
    labelsJson; // Depend on the stringified labels for deep equality check

    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const maplibregl = (window as any).maplibregl;

    if (!maplibregl) return;

    // Use a local array to track markers created in this effect run
    // cleanup func will remove them.
    const currentMarkers: maplibregl.Marker[] = [];

    const activeLabels = untrack(() => labels);

    if (activeLabels) {
      activeLabels.forEach(label => {
        const el = document.createElement('div');
        mount(CustomLabel, {
          target: el,
          props: { name: label.name, style: label.style, isDark }
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          opacityWhenCovered: 0
        })
          .setLngLat(label.coords)
          .addTo(map);

        currentMarkers.push(marker);
      });
    }

    markers = currentMarkers;

    return () => {
      currentMarkers.forEach(m => m.remove());
    };
  });
</script>
