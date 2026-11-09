<script lang="ts">
  import { Annotation } from '@abcnews/components-dataviz';
  import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import type { LabelAnchor, SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { disableMapAnimation, prefersReducedMotion } from '../../../lib/stores';
  import { getTween } from '../Tween/context.ts';
  import { tweenStopsValue } from '../Tween/utils.ts';
  import { symbolExtents, type Extents } from '../../../lib/symbolImage.ts';
  import { labelShift } from './labelPlacement.ts';
  import { resolveLabelColours } from './labelColours.ts';

  interface Props {
    /** First panel's copy of the symbol layer; its `annotation` is the label text */
    config: Stacked<SymbolLayer>;
    /** Opacity per panel; `0` where the symbol is absent */
    opacityStops: number[];
    /** Position for the panel currently being entered, picked by `SymbolHandler` */
    coords: [number, number];
  }

  let { config, opacityStops, coords }: Props = $props();

  const NO_EXTENTS: Extents = { up: 0, down: 0, left: 0, right: 0 };
  const UPLOADED_IMAGE_EXTENTS: Extents = { up: 10, down: 10, left: 10, right: 10 };

  const mapRoot = getContext<{ map: MapLibreMap | null }>('mapInstance');
  const tween = getTween();

  /** Zero-size element the Marker positions. `Annotation` anchors itself to this point with CSS. */
  let anchorElement = $state<HTMLDivElement>();
  let marker = $state.raw<Marker>();

  const style = $derived(config.labelStyle);
  const anchor = $derived<LabelAnchor>(style?.anchor ?? 'bottom-left');
  const showBackground = $derived(style?.showBackground ?? true);
  const colours = $derived(resolveLabelColours(style, config.colour, config.scheme));
  // The squared-off corner points at the symbol, so it only applies to a corner anchor.
  const pointer = $derived(
    (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).find(corner => corner === anchor) ?? 'none'
  );
  // Moved off the coordinate by how far the symbol reaches on the side the label sits (a pin reaches
  // far up but only half its width sideways), or not at all when the symbol is hidden. An uploaded
  // image has no known shape, so it keeps an even gap.
  const extents = $derived<Extents>(
    config.hideSymbol ? NO_EXTENTS : config.symbol ? symbolExtents(config.symbol) : UPLOADED_IMAGE_EXTENTS
  );
  const shift = $derived(labelShift(anchor, extents));

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
  <div class="annotation-fade" style:opacity style:transform="translate({shift[0]}px, {shift[1]}px)">
    <!-- `pre` is on the text span only: on the whole label it also kept the markup's own indentation, adding a blank line at the top. -->
    <Annotation
      {anchor}
      {pointer}
      color={colours.text}
      fill={showBackground ? colours.background : undefined}
      stroke={showBackground ? undefined : colours.background}
      variant={showBackground ? 'filled' : 'outline'}
      gooey
      style="text-align:left"><span class="annotation-text">{config.annotation}</span></Annotation
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
