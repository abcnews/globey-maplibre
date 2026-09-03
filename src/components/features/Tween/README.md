# TweenController

A single tween clock shared by every scrollyteller feature, so map features
animate between panels on the same timeline as the camera.

---

## Why this exists

A scrollyteller is a list of `panels`. Each panel carries a decoded marker config
(`panel.data: DecodedObject`) describing the whole map state at that point —
camera, base map, GeoJSON layers, custom labels, icons, rasters, projection.

Historically only the **camera** animated between panels
([`PanZoom/PanZoomScrollHandler.svelte`](../PanZoom/PanZoomScrollHandler.svelte)).
Every other handler read `options = panels[currentPanel].data` and applied it
instantly, so labels, layers and icons **popped** on each panel change.

`TweenController` replaces the camera's bespoke tween with one clock that any
feature can read. A feature interpolates its values between the two panels using
the same clock as the camera so everything stays in sync.

---

## Playback modes

The mode is a property of the transition **into** a panel — the `animationMode`
marker key (`am` in the URL hash, default `'scroll'`), read from
`panels[toPanel].data`.

- **`scroll`** — progress is tied to scroll position. Stop half-way between panels
  and the tween holds there. A short catch-up smoothing (`SCROLL_SMOOTHING_MS`,
  150 ms) is applied on non-touch devices like scrollwheels; touch devices
  track scroll 1:1 so it feels snappier.
- **`immediate`** — on reaching a panel the tween plays `0 → 1` over a fixed
  duration (`animationDuration`, default 2000 ms) and cannot be
  paused part-way. Scrolling back to the previous panel plays it in reverse.

Under reduced motion (`prefersReducedMotion` or `disableMapAnimation` in
[`../../../lib/stores.ts`](../../../lib/stores.ts)) both modes snap — the position
jumps with `duration: 0`.

---

## Mental model

The controller exposes one continuous number, **`position`**:

```
position = 0        panel 0
position = 1.5      half-way from panel 1 to panel 2
position = 3        panel 3
```

From `position` the controller derives the properties being blended and the
blend factor:

| Getter       | Meaning                                                        |
| ------------ | -------------------------------------------------------------- |
| `fromPanel`  | `clamp(floor(position), 0, N-1)` — lower panel of the pair     |
| `toPanel`    | `clamp(fromPanel + 1, 0, N-1)` — upper panel of the pair       |
| `t`          | `clamp(position - fromPanel, 0, 1)` — linear blend factor      |
| `easedT`     | `easeInOutCubic(t)` — shaped blend factor, matches the camera  |
| `fromConfig` | `panels[fromPanel].data` (a `DecodedObject`)                   |
| `toConfig`   | `panels[toPanel].data`                                         |
| `mode`       | `'scroll'` or `'immediate'` for the current segment            |
| `panelCount` | number of panels; `0` on the builder / static path (see below) |

---

## Consuming the clock in a feature

[`CustomGlobe.svelte`](../../CustomGlobe/CustomGlobe.svelte) creates the
instance and provides it on context.

### A single numeric or colour value

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import { getTween } from '../Tween/context.ts';

  let { config } = $props<{ config: MyConfig }>();
  const mapRoot = getContext<{ map: Map }>('mapInstance');
  const tween = getTween();

  // Blend between the two panels; fall back to the static prop in the builder.
  const opacity = $derived(
    tween.panelCount > 0
      ? tween.lerp(tween.fromConfig.myOpacity ?? 1, tween.toConfig.myOpacity ?? 1, tween.easedT)
      : (config.myOpacity ?? 1)
  );

  // Push the current value at each tick. `easedT` only changes while a transition
  // is playing, so this is idle at rest.
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !map.getLayer('my-layer')) return;
    map.setPaintProperty('my-layer', 'fill-opacity', opacity);
  });
</script>
```

Use `tween.lerpColour(from, to, t)` for hex / CSS colours and
`tween.lerpCoords(from, to, t)` for `[lng, lat]` pairs (shortest path across the
antimeridian). All three are also importable from
[`./utils.ts`](./utils.ts) for tests.

### A collection (many features in one source)

Build the **keyed union** of `fromConfig`'s items and `toConfig`'s items. For each
key:

- in both panels → render it, opacity `1` (persistent);
- outgoing only → render it, opacity `1 - easedT` (leaving);
- incoming only → render it, opacity `easedT` (entering).

Then `source.setData` the resolved set each tick and drive `*-opacity` from a
per-feature `opacity` property (e.g. `['number', ['get', 'opacity'], 1]`).

Reference: [`../CustomLabels/utils.ts`](../CustomLabels/utils.ts)
(`resolveLabelTransition`) and its use in
[`../CustomLabels/MapCustomLabelHandler.svelte`](../CustomLabels/MapCustomLabelHandler.svelte).

### Discrete values

Values that cannot be interpolated (`projection`, `base`, a layer id, an enum)
should not be blended. Either keep `fromConfig`'s value until `t >= 1`, or switch
at `t >= 0.5`. Match whatever the camera / rest of the app does for that field.

### Reduced motion

Read the global stores directly and snap — do not route this through the
controller:

```svelte
import { prefersReducedMotion, disableMapAnimation } from '../../../lib/stores';
const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);
const easedT = $derived(reducedMotion ? (tween.t < 0.5 ? 0 : 1) : tween.easedT);
```

### Builder / static path

There are no panels, so `tween.panelCount === 0`. Fall back to the component's own
config prop (`config`, `options`, `labels`, …) with no transition. Everything
still renders; nothing animates.

---

## API

### `class TweenController`

`new TweenController(initialPanel = 0)`

| Member                               | Type                               | Notes                                                                                        |
| ------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `sync(input)`                        | `(TweenSyncInput) => void`         | Called once per scroll tick by `CustomGlobe`. Reads reduced motion from `lib/stores` itself. |
| `position`                           | `number`                           | Continuous panel position.                                                                   |
| `panels`                             | `PanelDefinition<DecodedObject>[]` | Current panels.                                                                              |
| `panelCount`                         | `number`                           | `0` when idle (builder / static).                                                            |
| `fromPanel` / `toPanel`              | `number`                           | Clamped indices of the blended pair.                                                         |
| `t` / `easedT`                       | `number`                           | Linear / cubic-eased blend factor, `0..1`.                                                   |
| `fromConfig` / `toConfig`            | `DecodedObject`                    | The two panels' configs. Frozen `{}` when idle.                                              |
| `mode`                               | `AnimationMode`                    | Segment's playback mode.                                                                     |
| `lerp` / `lerpColour` / `lerpCoords` | functions                          | Interpolation helpers, also in `./utils.ts`.                                                 |

### `TweenSyncInput`

`{ panels, currentPanel, virtualPanel, panelPct, isTouch }` — the raw scrollyteller
progress. `virtualPanel` is `-1` in the prelude, `0..N-1` on panels, `N` in the
outro.

### `getTween()` / `setTween(controller)`

Typed context pair from [`./context.ts`](./context.ts) (Svelte `createContext`).
`getTween()` throws if no `setTween()` ran in an ancestor.

### `./utils.ts`

| Export                                                                               | Notes                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computeDesiredPosition({ currentPanel, virtualPanel, panelPct, panelCount, mode })` | Pure. The per-tick target for the internal `Tween`. Prelude → `0`; outro → `panelCount - 1`; `scroll` → `currentPanel + panelPct`; `immediate` → `currentPanel`. |
| `lerp(from, to, t)`                                                                  | Linear interpolation.                                                                                                                                            |
| `lerpColour(from, to, t)`                                                            | Interpolates hex / CSS colours; falls back to whichever side is defined.                                                                                         |
| `lerpCoords(from, to, t)`                                                            | Interpolates `[lng, lat]`, shortest path across ±180°.                                                                                                           |
| `easeInOutCubic`                                                                     | Re-exported from `../PanZoom/utils.ts`.                                                                                                                          |

### `./types.ts`

`AnimationMode = 'scroll' | 'immediate'`.

---

## Edge cases (all handled by the model, no extra code)

| Situation                         | Result                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| At rest on a panel                | `t = 0` → `fromConfig` is that panel, `easedT = 0`               |
| Prelude                           | `position` pinned to `0`                                         |
| Outro / last panel / single panel | `fromPanel === toPanel`, `easedT` still `0`, values equal        |
| Builder / static (no panels)      | `panelCount === 0` → consumers use their static prop             |
| Reduced motion                    | `duration: 0` → `position` and `easedT` snap                     |
| `immediate` mode                  | `easedT` ramps over `animationDuration`, reverses on scroll-back |

---

## Files

| File                                                       | Purpose                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [`TweenController.svelte.ts`](./TweenController.svelte.ts) | The class.                                                    |
| [`context.ts`](./context.ts)                               | `getTween` / `setTween`.                                      |
| [`utils.ts`](./utils.ts)                                   | `computeDesiredPosition`, `lerp`, `lerpColour`, `lerpCoords`. |
| [`utils.test.ts`](./utils.test.ts)                         | Pure-helper tests.                                            |
| [`types.ts`](./types.ts)                                   | `AnimationMode`.                                              |
| [`index.ts`](./index.ts)                                   | Barrel.                                                       |

## Current consumers

- [`../PanZoom/PanZoomScrollHandler.svelte`](../PanZoom/PanZoomScrollHandler.svelte)
  — camera (`resolveAllPanelViews` + `createZoomInterpolator(startView, targetView)(t)`).
- [`../CustomLabels/MapCustomLabelHandler.svelte`](../CustomLabels/MapCustomLabelHandler.svelte)
  — custom-label cross-fade.
