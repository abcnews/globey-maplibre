# TweenController

A shared tween clock that synchronises map camera movements and layer transitions across scrollyteller panels.

---

## Overview

A scrollyteller consists of sequential `panels`, each defining map configuration (camera position, GeoJSON layers, custom labels, icons, rasters, and projection).

`TweenController` provides a unified clock for all map features. Individual handlers read this clock to interpolate properties smoothly between panels alongside camera movements.

---

## The two clocks

`TweenController` manages two parallel clocks updated on every tick:

- **`scroll`**: Target is `currentPanel + panelPct`. Progress tracks scroll position directly. Smooths mousewheel input with a 150ms catch-up transition while updating 1:1 on touch devices.
- **`immediate`**: Target is `currentPanel`. Plays from start to finish over a fixed duration (`animationDuration`, default 2000ms) upon reaching a panel, and plays in reverse when scrolling back.

Camera playback mode is governed by the panel's `animationMode` (`'scroll'` or `'immediate'`), while individual layers choose their timing via `animationClock`.

Under reduced motion (`prefersReducedMotion` or `disableMapAnimation`), transitions snap directly to the active panel without easing.

---

## State management

Panels are held in raw state (`$state.raw`) rather than deep reactive state. This ensures array references remain stable across 60fps scroll frames, avoiding unnecessary layer teardowns and re-renders.

---

## Mental model

The controller tracks progression as a continuous number, `position` (for example, `0` is panel 0, `1.5` is halfway between panels 1 and 2, and `3` is panel 3).

From `position`, derived properties are calculated:

- **`fromPanel`**: Lower index of the active panel pair (`Math.floor(position)` clamped between 0 and `panelCount - 1`).
- **`toPanel`**: Upper index of the active panel pair (`fromPanel + 1`).
- **`t`**: Linear progress between `fromPanel` and `toPanel` (clamped `0..1`).
- **`easedT`**: Progress shaped by cubic in-out easing for natural transitions.
- **`fromConfig`**: Decoded configuration for `fromPanel`.
- **`toConfig`**: Decoded configuration for `toPanel`.
- **`mode`**: Active animation mode (`'scroll'` or `'immediate'`).
- **`panelCount`**: Total panels loaded (returns `0` in static or builder mode).

---

## Consuming the clock in a feature

[`CustomGlobe.svelte`](../../CustomGlobe/CustomGlobe.svelte) provides the `TweenController` instance via Svelte context. Features access it using `getTween()`.

### Numeric and colour values

Interpolate between `fromConfig` and `toConfig` using `lerp`, `lerpColour`, or `lerpCoords`:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import { getTween } from '../Tween/context.ts';

  let { config } = $props<{ config: MyConfig }>();
  const mapRoot = getContext<{ map: Map }>('mapInstance');
  const tween = getTween();

  const opacity = $derived(
    tween.panelCount > 0
      ? tween.lerp(tween.fromConfig.myOpacity ?? 1, tween.toConfig.myOpacity ?? 1, tween.easedT)
      : (config.myOpacity ?? 1)
  );

  $effect(() => {
    const map = mapRoot.map;
    if (!map || !map.getLayer('my-layer')) return;
    map.setPaintProperty('my-layer', 'fill-opacity', opacity);
  });
</script>
```

### Feature collections

For datasets containing multiple features (such as labels or markers):

- Compute the union of items between `fromConfig` and `toConfig`.
- Persistent items stay at opacity `1`.
- Exiting items fade out with `1 - easedT`.
- Entering items fade in with `easedT`.
- Update the MapLibre GeoJSON source using `setData`.

Reference: [`../CustomLabels/MapCustomLabelHandler.svelte`](../CustomLabels/MapCustomLabelHandler.svelte).

### Discrete properties

Properties that cannot be smoothly interpolated (such as projections or layer IDs) should snap at panel boundaries (`t >= 1` or `t >= 0.5`).

---

## Clock outputs and shader uniforms

Both clocks are written to MapLibre `global-state` uniforms each frame by `CustomGlobe`:

- **`scroll` (`tweenPosScroll`)**: Written as `fromPanel + easedT`.
- **`immediate` (`tweenPosImmediate`)**: Written directly as `position` (cubic in-out easing is already applied by the tween itself).

Layers bind their opacity directly to either uniform using `tweenStopsExpression`.

---

## API reference

### `TweenController`

- `sync(input: TweenSyncInput)`: Synchronises scroll state from scrollyteller.
- `scroll`: The continuous scroll-tied `TweenClock`.
- `immediate`: The fixed-duration arrival `TweenClock`.
- `clock(mode: AnimationMode)`: Returns either `immediate` or `scroll` clock.
- `position`: Current position value for the active mode.
- `fromPanel` / `toPanel`: Panel indices currently being blended.
- `t` / `easedT`: Linear and cubic-eased blend factors (`0..1`).
- `fromConfig` / `toConfig`: Decoded marker configurations for the active blend pair.
- `mode`: Current segment animation mode (`'scroll'` or `'immediate'`).
- `panels` / `panelCount`: Loaded panels and panel count.
- `lerp(from, to, t)`: Linear numeric interpolation.
- `lerpColour(from, to, t)`: Hex and CSS colour blending.
- `lerpCoords(from, to, t)`: Longitude and latitude interpolation over the antimeridian.

### `TweenClock`

- `set(target, { duration, easing })`: Retargets the clock, skipping redundant calls if target and duration are unchanged.
- `position`: Current continuous position.
- `target`: Target position being animated towards.
- `fromPanel` / `toPanel`: Blended panel index pair.
- `t` / `easedT`: Linear and eased progress between panels.

### Utilities (`utils.ts`)

- `computeDesiredPosition(input)`: Calculates target position for scroll or immediate modes.
- `clockStateKey(mode)`: Returns `'tweenPosImmediate'` or `'tweenPosScroll'`.
- `layerClockKey(clock?)`: Resolves layer animation clock key (defaults to scroll).
- `tweenStopsExpression(stops, key)`: Generates a MapLibre interpolation expression driven by global state.

---

## File structure

- [`TweenController.svelte.ts`](./TweenController.svelte.ts): Implements `TweenController` and `TweenClock`.
- [`context.ts`](./context.ts): Context helpers (`getTween` / `setTween`).
- [`utils.ts`](./utils.ts): Pure interpolation and MapLibre expression helpers.
- [`types.ts`](./types.ts): Type definitions (`AnimationMode`).
- [`index.ts`](./index.ts): Barrel exports.
