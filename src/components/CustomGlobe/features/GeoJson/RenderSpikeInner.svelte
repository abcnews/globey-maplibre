<script lang="ts">
  import { getContext } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { evaluateColour, evaluateHeight } from './utils';

  let {
    data,
    config,
    sourceId,
    SpikeLayerClass
  }: { data: any; config: GeoJsonConfig; sourceId: string; SpikeLayerClass: any } = $props();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  const layerId = $derived(`${sourceId}-spike`);
  let layer: any;

  // Animation state
  let targetHeights: Float32Array;
  let targetColours: Float32Array;

  // The state we are animating FROM
  let startHeights: Float32Array;
  let startColours: Float32Array;

  // The state currently rendered (to use as start if interrupted)
  let lastRenderedHeights: Float32Array;
  let lastRenderedColours: Float32Array;

  let animationFrame: number;
  let startTime: number;
  const DURATION = 500;

  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
      : [0, 0, 0];
  }

  $effect(() => {
    const map = mapRoot.map;
    if (!map || !SpikeLayerClass) return;

    layer = new SpikeLayerClass({
      id: layerId,
      baseDiameter: 15000
    });

    map.addLayer(layer as any);

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    };
  });

  // Update locations
  $effect(() => {
    if (!layer || !data || !data.features) return;
    const points: [number, number][] = data.features.map((f: any) => {
      const coords = f.geometry.coordinates;
      return [coords[0], coords[1]];
    });

    const count = points.length;
    layer.setLocations(points);

    // Resize arrays if needed
    if (!lastRenderedHeights || lastRenderedHeights.length !== count) {
      lastRenderedHeights = new Float32Array(count).fill(0);
      lastRenderedColours = new Float32Array(count * 3).fill(1);
      // If resizing, we reset 'start' state too
      startHeights = new Float32Array(count).fill(0);
      startColours = new Float32Array(count * 3).fill(1);
    }
  });

  // Calculate targets and animate
  $effect(() => {
    if (!layer || !data || !data.features || !lastRenderedHeights) return;
    const count = data.features.length;

    targetHeights = new Float32Array(count);
    targetColours = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const feature = data.features[i];
      const h = evaluateHeight(config, feature);
      // Opacity check:
      const opacity =
        config.filter?.prop && !config.filter.values.includes(String(feature.properties?.[config.filter.prop])) ? 0 : 1;

      targetHeights[i] = opacity > 0 ? h : 0;

      const colourHex = evaluateColour(config, feature);
      const [r, g, b] = hexToRgb(colourHex);
      targetColours[i * 3] = r;
      targetColours[i * 3 + 1] = g;
      targetColours[i * 3 + 2] = b;
    }

    startAnimation();
  });

  function startAnimation() {
    // Capture current state as start state
    if (lastRenderedHeights) {
      startHeights = new Float32Array(lastRenderedHeights);
      startColours = new Float32Array(lastRenderedColours);
    }

    cancelAnimationFrame(animationFrame);
    startTime = performance.now();
    animate();
  }

  function animate() {
    const now = performance.now();
    const progress = Math.min((now - startTime) / DURATION, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);

    if (!layer || !startHeights || !targetHeights) return;

    const count = startHeights.length;
    const heights = new Float32Array(count);
    const colours = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Lerp height
      heights[i] = startHeights[i] + (targetHeights[i] - startHeights[i]) * ease;

      // Lerp colour
      const idx = i * 3;
      colours[idx] = startColours[idx] + (targetColours[idx] - startColours[idx]) * ease;
      colours[idx + 1] = startColours[idx + 1] + (targetColours[idx + 1] - startColours[idx + 1]) * ease;
      colours[idx + 2] = startColours[idx + 2] + (targetColours[idx + 2] - startColours[idx + 2]) * ease;
    }

    layer.updateData(heights, colours);

    // Update our tracker
    lastRenderedHeights = heights;
    lastRenderedColours = colours;

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    }
  }
</script>
