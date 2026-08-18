<script lang="ts">
  import { AttributionControl, type Map } from 'maplibre-gl';
  import { getContext } from 'svelte';
  import { isOsmBase, escapeHTML } from '../mapStyle/utils';

  let {
    attribution,
    base,
    hideOsm = false
  }: {
    attribution?: string;
    base?: string;
    hideOsm?: boolean;
  } = $props();

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let attributionControl: AttributionControl | null = null;

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    let customAttribution = [];

    if (attribution) {
      customAttribution.push(
        ...attribution
          .split(',')
          .map((s: string) => escapeHTML(s))
          .filter(Boolean)
      );
    }

    if (!hideOsm && isOsmBase(base)) {
      customAttribution.push('<a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>');
    }

    const finalAttribution = customAttribution.join(', ');

    if (attributionControl) {
      map.removeControl(attributionControl);
    }

    if (finalAttribution) {
      attributionControl = new AttributionControl({
        customAttribution: finalAttribution,
        compact: false
      });
      map.addControl(attributionControl, 'bottom-right');
    } else {
      attributionControl = null;
    }

    return () => {
      if (attributionControl) {
        map.removeControl(attributionControl);
        attributionControl = null;
      }
    };
  });
</script>
