import { interpolateColour } from '../../../lib/colours.ts';
import type { AnimationMode } from './types.ts';

/** Standard cubic ease-in-out, shared with the camera interpolator. */
export { easeInOutCubic } from '../PanZoom/utils.ts';

const LONGITUDE_SPAN_DEGREES = 360;
const HALF_LONGITUDE_SPAN_DEGREES = 180;

interface DesiredPositionInput {
  /** Clamped active panel index (0..N-1). */
  currentPanel: number;
  /** Raw lifecycle index: -1 prelude, 0..N-1 panels, N outro. */
  virtualPanel: number;
  /** Scroll progress from currentPanel to currentPanel+1 (0..1). */
  panelPct: number;
  /** Total panel count. */
  panelCount: number;
  /** Mode of the segment currently being entered. */
  mode: AnimationMode;
}

/**
 * Target for the central `position` tween, expressed on a continuous scale where
 * whole numbers sit on a panel and fractions blend towards the next panel
 * (e.g. `2.37` is 37% of the way from panel 2 to panel 3).
 *
 * In `scroll` mode the target tracks scroll position directly. In `immediate`
 * mode `panelPct` is ignored and the target snaps to the whole panel index — the
 * tween's own duration produces the visible motion, and the value only moves
 * when the reader actually reaches a new panel (or scrolls back to a previous
 * one).
 */
export function computeDesiredPosition({
  currentPanel,
  virtualPanel,
  panelPct,
  panelCount,
  mode
}: DesiredPositionInput): number {
  const lastPanel = Math.max(panelCount - 1, 0);

  // Prelude: hold on the first panel.
  if (virtualPanel < 0) return 0;
  // Outro: hold on the last panel.
  if (virtualPanel >= panelCount) return lastPanel;

  const raw = mode === 'immediate' ? currentPanel : currentPanel + panelPct;
  return Math.min(Math.max(raw, 0), lastPanel);
}

/** Linear interpolation between two numbers. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * MapLibre global-state key holding the current tween position
 * (`fromPanel + easedT`). `CustomGlobe` writes it once per frame; feature layers
 * read it from `tweenStopsExpression`.
 *
 * Transitional: this key follows whichever clock the panel's `animationMode`
 * selects. Layers that don't name a clock (the default) read it. It retires once
 * per-layer clock selection lands and every layer passes an explicit key.
 */
export const MAPLIBRE_TWEEN_STATE_KEY = 'tweenPos';

/** Global-state key for the always-scroll-tied clock. */
export const MAPLIBRE_TWEEN_SCROLL_STATE_KEY = 'tweenPosScroll';

/** Global-state key for the always-play-on-arrival clock. */
export const MAPLIBRE_TWEEN_IMMEDIATE_STATE_KEY = 'tweenPosImmediate';

/** The global-state key a layer should read for a given clock. */
export function clockStateKey(mode: AnimationMode): string {
  return mode === 'immediate'
    ? MAPLIBRE_TWEEN_IMMEDIATE_STATE_KEY
    : MAPLIBRE_TWEEN_SCROLL_STATE_KEY;
}

/**
 * Builds a paint value that steps through one value per panel as the tween
 * position moves. The expression is pure (only the global-state and literals),
 * so MapLibre compiles it to a shader uniform and one `setGlobalStateProperty`
 * per frame updates every layer that uses it.
 *
 * A single value (builder / static, one "panel") is returned as-is.
 */
export function tweenStopsExpression(
  perPanelValues: (number | string)[],
  posKey: string = MAPLIBRE_TWEEN_STATE_KEY
): any {
  if (perPanelValues.length === 1) return perPanelValues[0];

  const stops = perPanelValues.flatMap((value, panel) => [panel, value]);
  return ['interpolate', ['linear'], ['number', ['global-state', posKey], 0], ...stops];
}

/**
 * Interpolates between two CSS colours. Falls back to whichever colour is
 * defined when one side is missing (a feature entering or leaving).
 */
export function lerpColour(from: string | undefined, to: string | undefined, t: number): string {
  if (!from) return to ?? '';
  if (!to) return from;
  return interpolateColour(from, to, t);
}

/**
 * Interpolates a `[longitude, latitude]` pair, taking the shortest path around
 * the antimeridian so a Fiji → Samoa move crosses ±180 rather than unwinding the
 * long way round.
 */
export function lerpCoords(
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] {
  const [fromLng, fromLat] = from;
  let [toLng] = to;
  const toLat = to[1];

  const deltaLng = toLng - fromLng;
  if (deltaLng > HALF_LONGITUDE_SPAN_DEGREES) toLng -= LONGITUDE_SPAN_DEGREES;
  else if (deltaLng < -HALF_LONGITUDE_SPAN_DEGREES) toLng += LONGITUDE_SPAN_DEGREES;

  let lng = lerp(fromLng, toLng, t);
  // Normalise back into [-180, 180].
  lng =
    ((((lng + HALF_LONGITUDE_SPAN_DEGREES) % LONGITUDE_SPAN_DEGREES) + LONGITUDE_SPAN_DEGREES) %
      LONGITUDE_SPAN_DEGREES) -
    HALF_LONGITUDE_SPAN_DEGREES;

  return [lng, lerp(fromLat, toLat, t)];
}
