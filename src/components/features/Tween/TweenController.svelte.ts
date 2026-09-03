import { Tween } from 'svelte/motion';
import { cubicOut, cubicInOut } from 'svelte/easing';
import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
import type { DecodedObject } from '../../../lib/marker';
import type { AnimationMode } from './types.ts';
import { computeDesiredPosition, easeInOutCubic, lerp, lerpColour, lerpCoords } from './utils.ts';

/** Scroll-mode catch-up smoothing, replacing PanZoom's old WHEEL_TWEEN. */
const SCROLL_SMOOTHING_MS = 150;

/** Immediate-mode duration when the target panel doesn't set `animationDuration`. */
const DEFAULT_IMMEDIATE_DURATION_MS = 2000;

/** Stable reference returned by `fromConfig`/`toConfig` before panels load. */
const EMPTY_CONFIG: DecodedObject = Object.freeze({});

export interface TweenSyncInput {
  panels: PanelDefinition<DecodedObject>[];
  /** Clamped active panel index (0..N-1). */
  currentPanel: number;
  /** Raw lifecycle index: -1 prelude, 0..N-1 panels, N outro. */
  virtualPanel: number;
  /** Scroll progress from currentPanel to currentPanel+1 (0..1). */
  panelPct: number;
  /** Reduced-motion preference or the builder's animation-disable toggle. */
  reducedMotion: boolean;
  /** Coarse-pointer touch device (no hover) — skips scroll smoothing. */
  isTouch: boolean;
}

/**
 * The single tween clock shared by every scrollyteller feature.
 *
 * `CustomGlobe` owns one instance, publishes it on context, and calls `sync()`
 * once per scroll tick. Features read the getters — all computed from `$state`
 * plus the internal `Tween`, so nothing writes state inside an effect — and use
 * the `lerp*` helpers to blend their own `fromConfig`/`toConfig` values.
 *
 * `position` is continuous: whole numbers sit on a panel, fractions blend to the
 * next one, so values interpolate smoothly across a panel boundary instead of
 * jumping when the active index changes.
 */
export class TweenController {
  #position: Tween<number>;
  #panels = $state<PanelDefinition<DecodedObject>[]>([]);

  constructor(initialPanel = 0) {
    this.#position = new Tween(initialPanel);
  }

  /**
   * Push the latest scroll state into the tween. This is the only place the
   * controller mutates anything, driven by a single `$effect` in `CustomGlobe`.
   */
  sync(input: TweenSyncInput): void {
    this.#panels = input.panels;

    const segTo = Math.min(input.currentPanel + 1, input.panels.length - 1);
    const mode: AnimationMode = input.panels[segTo]?.data.animationMode ?? 'scroll';
    const duration = input.panels[segTo]?.data.animationDuration ?? DEFAULT_IMMEDIATE_DURATION_MS;

    const desired = computeDesiredPosition({
      currentPanel: input.currentPanel,
      virtualPanel: input.virtualPanel,
      panelPct: input.panelPct,
      panelCount: input.panels.length,
      mode
    });

    if (input.reducedMotion) {
      this.#position.set(desired, { duration: 0 });
    } else if (mode === 'scroll') {
      this.#position.set(desired, {
        duration: input.isTouch ? 0 : SCROLL_SMOOTHING_MS,
        easing: cubicOut
      });
    } else {
      this.#position.set(desired, { duration, easing: cubicInOut });
    }
  }

  /** Panels currently loaded. */
  get panels(): PanelDefinition<DecodedObject>[] {
    return this.#panels;
  }

  get panelCount(): number {
    return this.#panels.length;
  }

  /** Continuous tween position, e.g. `2.37`. */
  get position(): number {
    return this.#position.current;
  }

  /** Lower index of the panel pair currently being blended. */
  get fromPanel(): number {
    if (this.panelCount === 0) return 0;
    return Math.min(Math.max(Math.floor(this.position), 0), this.panelCount - 1);
  }

  /** Upper index of the panel pair currently being blended. */
  get toPanel(): number {
    if (this.panelCount === 0) return 0;
    return Math.min(this.fromPanel + 1, this.panelCount - 1);
  }

  /** Linear blend factor between `fromPanel` and `toPanel` (0..1). */
  get t(): number {
    return Math.min(Math.max(this.position - this.fromPanel, 0), 1);
  }

  /** `t` shaped by a cubic ease-in-out, for features that want an eased curve. */
  get easedT(): number {
    return easeInOutCubic(this.t);
  }

  get fromConfig(): DecodedObject {
    return this.#panels[this.fromPanel]?.data ?? EMPTY_CONFIG;
  }

  get toConfig(): DecodedObject {
    return this.#panels[this.toPanel]?.data ?? EMPTY_CONFIG;
  }

  /** Mode of the segment currently being entered. */
  get mode(): AnimationMode {
    return this.#panels[this.toPanel]?.data.animationMode ?? 'scroll';
  }

  // Interpolation helpers, also importable from ./utils.ts for tests and non-context callers.
  lerp = lerp;
  lerpColour = lerpColour;
  lerpCoords = lerpCoords;
}
