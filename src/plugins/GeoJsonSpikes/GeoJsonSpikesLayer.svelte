<script lang="ts">
  import { getSpikeLayer } from './SpikeLayer.ts';
  import { getColourEvaluator, getHeightEvaluator } from './utils.ts';
  import { parseColor } from '../../lib/colours.ts';
  import { addLayerWithZIndex, removeLayerWithZIndex, setLayerZIndex, Z_INDEX_GEOJSON } from '../../components/features/layers/layerUtils.ts';
  import type { CustomLayerProps } from '../../lib/plugins/types.ts';
  import type { GeoJsonSpikesConfig } from './types.ts';

  let { map, config, zIndex = Z_INDEX_GEOJSON }: CustomLayerProps<GeoJsonSpikesConfig> = $props();

  const layerId = `spikes-${crypto.randomUUID()}`;

  let SpikeLayerClass = $state<any>();

  $effect(() => {
    getSpikeLayer().then(cls => {
      SpikeLayerClass = cls;
    });
  });

  let layer: any;
  let animationFrame: number;
  let startTime: number;
  const DURATION = 500;

  // Map state for pixel-based sizing
  let currentZoom = $state(map.getZoom());

  // Animation state buffers
  let currentHeights: Float32Array;
  let currentColours: Float32Array;
  let startHeights: Float32Array;
  let startColours: Float32Array;

  // Lifecycle: Manage the Three.js Layer
  $effect(() => {
    if (!SpikeLayerClass) return;

    layer = new SpikeLayerClass({
      id: `${layerId}-spike`,
      baseDiameter: 15000
    });

    addLayerWithZIndex(map, layer, zIndex);

    // Zoom listener for pixel-based sizing
    const onZoom = () => (currentZoom = map.getZoom());
    map.on('zoom', onZoom);
    currentZoom = map.getZoom();

    const lid = `${layerId}-spike`;
    return () => {
      map.off('zoom', onZoom);
      cancelAnimationFrame(animationFrame);
      removeLayerWithZIndex(map, lid);
    };
  });

  // Derived diameter based on pointSize (supporting k=km and p=px)
  const diameter = $derived.by(() => {
    const ps = config.pointSize;
    if (!ps) return 15000;

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
    const features = config.data?.features;
    if (!features?.length) return null;

    const colourEvaluator = getColourEvaluator(config);
    const heightEvaluator = getHeightEvaluator(config);
    const count = features.length;

    const locations: [number, number][] = [];
    const targetHeights = new Float32Array(count);
    const targetColours = new Float32Array(count * 3);

    features.forEach((f, i) => {
      const hVal = config.heightProp ? Number((f.properties as any)?.[config.heightProp]) || 0 : 0;

      const height = heightEvaluator(hVal);
      const colour = colourEvaluator(f);
      const [r, g, b] = parseColor(colour).map(c => c / 255);

      locations.push((f.geometry as any).coordinates as [number, number]);
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

  // Update Z-Index when changed
  $effect(() => {
    const lid = `${layerId}-spike`;
    if (!map.getLayer(lid)) return;

    setLayerZIndex(map, lid, zIndex);
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
