<script lang="ts">
  import { getContext } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { parseColor } from '../../../../lib/colours';
  import { getProcessedFeatures } from './utils';

  let {
    data,
    config,
    sourceId,
    SpikeLayerClass
  }: { data: any; config: GeoJsonConfig; sourceId: string; SpikeLayerClass: any } = $props();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  const layerId = $derived(`${sourceId}-spike`);
  let layer: any;

  // Animation state buffers
  let targetHeights: Float32Array;
  let targetColours: Float32Array;
  let startHeights: Float32Array;
  let startColours: Float32Array;
  let lastRenderedHeights: Float32Array;
  let lastRenderedColours: Float32Array;

  let animationFrame: number;
  let startTime: number;
  const DURATION = 500;

  // Initialise Three.js Spike Layer
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !SpikeLayerClass) return;

    layer = new SpikeLayerClass({
      id: layerId,
      baseDiameter: 15000
    });

    map.addLayer(layer as any);

    return () => {
      cancelAnimationFrame(animationFrame);
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    };
  });

  // Calculate targets and trigger animation whenever data or config changes
  $effect(() => {
    if (!layer || !data) return;

    // Use unified processing logic for filtering, coordinate extraction, and property evaluation
    const processed = getProcessedFeatures(config, data);
    const count = processed.length;

    // Sync locations with the layer (handles instantiation of Three.js objects)
    layer.setLocations(processed.map(p => p.coords));

    // Prepare target buffers for animation
    targetHeights = new Float32Array(count);
    targetColours = new Float32Array(count * 3);

    processed.forEach((p, i) => {
      targetHeights[i] = p.height;
      const [r, g, b] = parseColor(p.colour).map(c => c / 255);
      targetColours[i * 3] = r;
      targetColours[i * 3 + 1] = g;
      targetColours[i * 3 + 2] = b;
    });

    // Ensure we have current state buffers to animate from
    if (!lastRenderedHeights || lastRenderedHeights.length !== count) {
      lastRenderedHeights = new Float32Array(count).fill(0);
      lastRenderedColours = new Float32Array(count * 3).fill(1);
    }

    startAnimation();
  });

  function startAnimation() {
    if (!lastRenderedHeights) return;

    // Capture current visible state as our starting point
    startHeights = new Float32Array(lastRenderedHeights);
    startColours = new Float32Array(lastRenderedColours);

    cancelAnimationFrame(animationFrame);
    startTime = performance.now();
    animate();
  }

  function animate() {
    const now = performance.now();
    const progress = Math.min((now - startTime) / DURATION, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

    if (!layer || !startHeights || !targetHeights) return;

    const count = startHeights.length;
    const heights = new Float32Array(count);
    const colours = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Linear interpolation between start and target
      heights[i] = startHeights[i] + (targetHeights[i] - startHeights[i]) * ease;

      const idx = i * 3;
      colours[idx] = startColours[idx] + (targetColours[idx] - startColours[idx]) * ease;
      colours[idx + 1] = startColours[idx + 1] + (targetColours[idx + 1] - startColours[idx + 1]) * ease;
      colours[idx + 2] = startColours[idx + 2] + (targetColours[idx + 2] - startColours[idx + 2]) * ease;
    }

    // Push new data to Three.js InstancedMesh
    layer.updateData(heights, colours);

    // Update trackers for next frame or animation interruption
    lastRenderedHeights = heights;
    lastRenderedColours = colours;

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    }
  }
</script>
