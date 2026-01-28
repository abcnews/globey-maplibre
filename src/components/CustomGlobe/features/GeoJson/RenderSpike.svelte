<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import SpikeLayer from '../../../../snippets/SpikeLayer';
  import { evaluateColor, evaluateHeight } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config } = $props<{ data: any; config: GeoJsonConfig }>();

  const layerId = `geojson-spike-layer-${Math.random().toString(36).substring(2, 9)}`;
  let layer: SpikeLayer | undefined;

  // Animation state
  let targetHeights: Float32Array;
  let targetColors: Float32Array;

  // The state we are animating FROM
  let startHeights: Float32Array;
  let startColors: Float32Array;

  // The state currently rendered (to use as start if interrupted)
  let lastRenderedHeights: Float32Array;
  let lastRenderedColors: Float32Array;

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
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    layer = new SpikeLayer({
      id: layerId,
      baseDiameter: 15000 // Configurable?
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
      lastRenderedColors = new Float32Array(count * 3).fill(1);
      // If resizing, we reset 'start' state too
      startHeights = new Float32Array(count).fill(0);
      startColors = new Float32Array(count * 3).fill(1);
    }
  });

  // Calculate targets and animate
  $effect(() => {
    if (!layer || !data || !data.features || !lastRenderedHeights) return;
    const count = data.features.length;

    targetHeights = new Float32Array(count);
    targetColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const feature = data.features[i];
      const h = evaluateHeight(config, feature);
      // Opacity check:
      const opacity =
        config.filter?.prop && !config.filter.values.includes(String(feature.properties?.[config.filter.prop])) ? 0 : 1;

      targetHeights[i] = opacity > 0 ? h : 0;

      const colorHex = evaluateColor(config, feature);
      const [r, g, b] = hexToRgb(colorHex);
      targetColors[i * 3] = r;
      targetColors[i * 3 + 1] = g;
      targetColors[i * 3 + 2] = b;
    }

    startAnimation();
  });

  function startAnimation() {
    // Capture current state as start state
    if (lastRenderedHeights) {
      startHeights = new Float32Array(lastRenderedHeights);
      startColors = new Float32Array(lastRenderedColors);
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
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Lerp height
      heights[i] = startHeights[i] + (targetHeights[i] - startHeights[i]) * ease;

      // Lerp color
      const idx = i * 3;
      colors[idx] = startColors[idx] + (targetColors[idx] - startColors[idx]) * ease;
      colors[idx + 1] = startColors[idx + 1] + (targetColors[idx + 1] - startColors[idx + 1]) * ease;
      colors[idx + 2] = startColors[idx + 2] + (targetColors[idx + 2] - startColors[idx + 2]) * ease;
    }

    layer.updateData(heights, colors);

    // Update our tracker
    lastRenderedHeights = heights;
    lastRenderedColors = colors;

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    }
  }
</script>
