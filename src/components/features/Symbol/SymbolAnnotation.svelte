<script lang="ts">
  import { Annotation } from '@abcnews/components-dataviz';
  import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import type { AnnotationAnchor, SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { disableMapAnimation, prefersReducedMotion } from '../../../lib/stores';
  import { getTween } from '../Tween/context.ts';
  import { tweenStopsValue } from '../Tween/utils.ts';
  import { symbolReach } from '../../../lib/symbolImage.ts';
  import { resolveAnnotationColours } from './annotationColours.ts';

  interface Props {
    /** First panel's copy of the symbol layer; its `annotation` is the label text */
    config: Stacked<SymbolLayer>;
    /** Opacity per panel; `0` where the symbol is absent */
    opacityStops: number[];
    /** Position for the panel currently being entered, picked by `SymbolHandler` */
    coords: [number, number];
  }

  let { config, opacityStops, coords }: Props = $props();

  const mapRoot = getContext<{ map: MapLibreMap | null }>('mapInstance');
  const tween = getTween();

  /** Zero-size element the Marker positions. `Annotation` anchors itself to this point with CSS. */
  let anchorElement = $state<HTMLDivElement>();
  let marker = $state.raw<Marker>();

  const style = $derived(config.annotationStyle);
  const anchor = $derived<AnnotationAnchor>(style?.anchor ?? 'bottom-left');
  const showBackground = $derived(style?.showBackground ?? true);
  const colours = $derived(resolveAnnotationColours(style));
  // The squared-off corner points at the symbol, so it only applies to a corner anchor.
  const pointer = $derived(
    (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).find(corner => corner === anchor) ?? 'none'
  );
  // Clear of the symbol's edge (a pin reaches further than a circle), or exactly on the point when
  // the symbol is hidden. An uploaded image has no known extent, so it keeps a fixed gap.
  const offset = $derived(config.hideSymbol ? 0 : config.symbol ? symbolReach(config.symbol) : 10);

  // A DOM label can't read MapLibre's `global-state`, so the fade is worked out here each frame,
  // from the same clock position the symbol layer's own opacity follows.
  const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);
  const opacity = $derived(
    tweenStopsValue(opacityStops, tween.positionFor(config.animationClock ?? 'scroll', reducedMotion))
  );

  // The Marker handles projection, pan/zoom tracking and hiding on the far side of the globe.
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !anchorElement) return;

    const created = new Marker({ element: anchorElement }).setLngLat(untrack(() => coords)).addTo(map);
    marker = created;

    return () => {
      created.remove();
      marker = undefined;
    };
  });

  // Snap to the panel currently being entered, as the symbol icon does.
  $effect(() => {
    marker?.setLngLat(coords);
  });
</script>

<div bind:this={anchorElement} class="annotation-anchor">
  <!-- Opacity is on this inner element: the Marker owns its own element's opacity (globe back-face). -->
  <div class="annotation-fade" style:opacity>
    <!-- `pre` is on the text span only: on the whole label it also kept the markup's own indentation, adding a blank line at the top. -->
    <Annotation
      {anchor}
      {offset}
      {pointer}
      color={colours.text}
      fill={showBackground ? colours.background : undefined}
      stroke={showBackground ? undefined : colours.background}
      variant={showBackground ? 'filled' : 'outline'}
      gooey
      style="text-align:left"
      ><span class="annotation-text">{config.annotation}</span></Annotation
    >
  </div>
</div>

<style>
  /* Keeps the author's newlines and spacing. */
  .annotation-text {
    white-space: pre;
  }

  .annotation-anchor {
    width: 0;
    height: 0;
    pointer-events: none;
  }
</style>
