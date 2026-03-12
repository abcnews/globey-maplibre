<script lang="ts">
  import { getContext } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { parseColor } from '../../../../lib/colours';
  import { getColourEvaluator, getHeightEvaluator } from './utils';

  let {
    data,
    config,
    sourceId,
    SpikeLayerClass
  }: { data: any; config: GeoJsonConfig; sourceId: string; SpikeLayerClass: any } = $props();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const layerId = $derived(`${sourceId}-spike`);

  let layer: any;
  let animationFrame: number;
  let startTime: number;
  const DURATION = 500;

  // Map state for pixel-based sizing
  let currentZoom = $state(mapRoot.map?.getZoom() || 0);

  // Animation state buffers
  let currentHeights: Float32Array;
  let currentColours: Float32Array;
  let startHeights: Float32Array;
  let startColours: Float32Array;

  // Lifecycle: Manage the Three.js Layer
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !SpikeLayerClass) return;

    layer = new SpikeLayerClass({
      id: layerId,
      baseDiameter: 15000
    });

    map.addLayer(layer);

    // Zoom listener for pixel-based sizing
    const onZoom = () => (currentZoom = map.getZoom());
    map.on('zoom', onZoom);
    currentZoom = map.getZoom();

    const lid = layerId;
    return () => {
      map.off('zoom', onZoom);
      cancelAnimationFrame(animationFrame);
      if (map.getLayer(lid)) {
        map.removeLayer(lid);
      }
    };
  });

  // Derived diameter based on pointSize (supporting k=km and p=px)
  const diameter = $derived.by(() => {
    const map = mapRoot.map;
    const ps = config.pointSize;
    if (!map || !ps) return 15000;

    const { value, unit } = ps;

    if (unit === 'k') {
      return value * 1000;
    }

    if (unit === 'p') {
      // Calculate meters per pixel at the equator for the current zoom
      // This is a common approximation for consistent screen-relative sizing in 3D
      const metersPerPixel = (40075016.686 * Math.cos(0)) / Math.pow(2, currentZoom + 8);
      return value * metersPerPixel;
    }

    return 15000;
  });

  // Pre-calculate all values in a $derived for clarity and debuggability
  const processedValues = $derived.by(() => {
    if (!data?.features?.length) return null;

    const colourEvaluator = getColourEvaluator(config);
    const heightEvaluator = getHeightEvaluator(config);
    const count = data.features.length;

    const locations: [number, number][] = [];
    const targetHeights = new Float32Array(count);
    const targetColours = new Float32Array(count * 3);

    data.features.forEach((f: any, i: number) => {
      const props = f.properties || {};

      // Map GeoJSON properties to hVal/cVal for shared evaluators in utils.ts
      const hVal = config.spike?.heightProp ? Number(props[config.spike.heightProp]) || 0 : 0;
      let cVal: any;

      const style = config.styles?.[0] || { colourMode: 'scale' as const };
      if (style.colourMode === 'simple') {
        cVal = props['fill'] || '#888888';
      } else if (style.colourMode === 'scale' && style.colourProp) {
        cVal = Number(props[style.colourProp] || '0');
      }

      const height = heightEvaluator({ hVal });
      const colour = colourEvaluator({ cVal });
      const [r, g, b] = parseColor(colour).map(c => c / 255);

      locations.push(f.geometry.coordinates as [number, number]);
      targetHeights[i] = height;
      targetColours[i * 3] = r;
      targetColours[i * 3 + 1] = g;
      targetColours[i * 3 + 2] = b;
    });

    return { locations, targetHeights, targetColours };
  });

  // Reactivity: Handle Diameter & Data Changes
  $effect(() => {
    if (!layer || !processedValues) return;

    // Update diameter first
    layer.setBaseDiameter(diameter);

    const count = processedValues.locations.length;
    layer.setLocations(processedValues.locations);

    // Initialise or capture current state as the starting point for animation
    startHeights =
      currentHeights?.length === count ? new Float32Array(currentHeights) : new Float32Array(count).fill(0);
    startColours =
      currentColours?.length === count * 3 ? new Float32Array(currentColours) : new Float32Array(count * 3).fill(1);

    cancelAnimationFrame(animationFrame);
    startTime = performance.now();
    animate();
  });

  function animate() {
    const progress = Math.min((performance.now() - startTime) / DURATION, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    if (!layer || !processedValues) return;

    const { targetHeights, targetColours } = processedValues;

    // Interpolate between start and target
    currentHeights = startHeights.map((start, i) => start + (targetHeights[i] - start) * ease);
    currentColours = startColours.map((start, i) => start + (targetColours[i] - start) * ease);

    layer.updateData(currentHeights, currentColours);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    }
  }
</script>
