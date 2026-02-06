<script lang="ts">
  import { getContext } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { parseColor } from '../../../../lib/colours';
  import { getColourEvaluator, getHeightEvaluator, getProcessedFeatures } from './utils';

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

  /**
   * Pre-process GeoJSON into a slimmed-down format for high-performance rendering.
   */
  const sourceFeatures = $derived.by(() => {
    if (!data?.features) return [];

    // Cache prop lookups
    const hProp = config.spike?.heightProp;
    const cMode = config.colourMode;
    const cProp = config.colourProp;

    const preprocessedFeatures = data.features.map((f: any) => {
      const props = f.properties || {};

      // Extract height value
      const hVal = hProp ? Number(props[hProp]) || 0 : 0;

      // Extract colour value based on mode
      let cVal: any;
      if (cMode === 'simple') {
        cVal = props['fill'] || '#888888';
      } else if (cMode === 'scale' && cProp) {
        cVal = Number(props[cProp] || '0');
      } else if (cMode === 'class') {
        cVal = props[cProp || 'class'];
      }

      return {
        coords: f.geometry.coordinates as [number, number],
        hVal,
        cVal
      };
    });
    return preprocessedFeatures;
  });

  // Calculate targets and trigger animation whenever data or config changes
  $effect(() => {
    if (!layer || sourceFeatures.length === 0) return;

    // Use unified processing logic for filtering and property evaluation.
    // This now accepts our pre-processed features instead of raw GeoJSON.
    const colourEvaluator = getColourEvaluator(config);
    const heightEvaluator = getHeightEvaluator(config);

    const processed = sourceFeatures.map(feature => ({
      coords: feature.coords,
      height: heightEvaluator(feature),
      colour: colourEvaluator(feature)
    }));
    const count = processed.length;

    // Sync locations with the layer (handles instantiation of Three.js objects)
    layer.setLocations(sourceFeatures.map(f => f.coords));

    // Prepare target buffers for animation using functional mappings.
    // This avoids explicit iteration and manual indexing.
    targetHeights = Float32Array.from(processed.map(p => p.height));
    targetColours = Float32Array.from(processed.flatMap(p => parseColor(p.colour).map(c => c / 255)));

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

    // Linearly interpolate between start and target buffers using functional map
    const heights = startHeights.map((start, i) => start + (targetHeights[i] - start) * ease);
    const colours = startColours.map((start, i) => start + (targetColours[i] - start) * ease);

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
