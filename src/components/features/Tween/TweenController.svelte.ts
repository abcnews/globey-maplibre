import { Tween } from 'svelte/motion';
import { cubicOut, cubicInOut } from 'svelte/easing';
import { get } from 'svelte/store';
import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
import type { DecodedObject } from '../../../lib/marker';
import { prefersReducedMotion, disableMapAnimation } from '../../../lib/stores';
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
  /** Coarse-pointer touch device (no hover) — skips scroll smoothing. */
  isTouch: boolean;
}

/** Reduced-motion preference / the builder's animation-disable toggle — read from global state. */
const prefersReducedMotionNow = (): boolean => get(prefersReducedMotion) || get(disableMapAnimation);

/**
 * One continuous, monotonic panel position and the reads derived from it.
 *
 * `position` is continuous: whole numbers sit on a panel, fractions blend to the
 * next one. `TweenController` runs two of these side by side — a scroll-tied one
 * and a play-on-arrival one — and retargets both from `sync()` each tick.
 */
export class TweenClock {
  #position: Tween<number>;
  #panelCount: () => number;

  constructor(initialPanel: number, panelCount: () => number) {
    this.#position = new Tween(initialPanel);
    this.#panelCount = panelCount;
  }

  /** Retarget the clock. Called by `TweenController.sync()` once per tick. */
  set(target: number, opts: { duration: number; easing?: (t: number) => number }): void {
    this.#position.set(target, opts);
  }

  /** Continuous tween position, e.g. `2.37`. */
  get position(): number {
    return this.#position.current;
  }

  /** Lower index of the panel pair currently being blended. */
  get fromPanel(): number {
    const count = this.#panelCount();
    if (count === 0) return 0;
    return Math.min(Math.max(Math.floor(this.position), 0), count - 1);
  }

  /** Upper index of the panel pair currently being blended. */
  get toPanel(): number {
    const count = this.#panelCount();
    if (count === 0) return 0;
    return Math.min(this.fromPanel + 1, count - 1);
  }

  /** Linear blend factor between `fromPanel` and `toPanel` (0..1). */
  get t(): number {
    return Math.min(Math.max(this.position - this.fromPanel, 0), 1);
  }

  /** `t` shaped by a cubic ease-in-out, for features that want an eased curve. */
  get easedT(): number {
    return easeInOutCubic(this.t);
  }
}

/**
 * The tween clock shared by every scrollyteller feature.
 *
 * `CustomGlobe` owns one instance, publishes it on context, and calls `sync()`
 * once per scroll tick. Features read the getters — all computed from `$state`
 * plus the internal `Tween`s, so nothing writes state inside an effect — and use
 * the `lerp*` helpers to blend their own `fromConfig`/`toConfig` values.
 *
 * Two clocks run in parallel, both retargeted every tick:
 *
 * - `scroll` — target `currentPanel + panelPct`, scrubs with scroll position.
 * - `immediate` — target `currentPanel`, plays 0→1 over `animationDuration` on
 *   arrival and reverses on scroll-back.
 *
 * `animationMode` (`am`) selects which one the shared getters and the `tweenPos`
 * global-state key follow, so the single-clock API is unchanged. Per-layer clock
 * selection is a later phase.
 */
export class TweenController {
  // Use $state.raw to avoid re-proxying on every scroll frame, which triggers unnecessary map layer reloads.
  #panels = $state.raw<PanelDefinition<DecodedObject>[]>([]);
  #mode = $state<AnimationMode>('scroll');

  /** Always-scroll-tied clock. */
  readonly scroll: TweenClock;
  /** Always-play-on-arrival clock. */
  readonly immediate: TweenClock;

  constructor(initialPanel = 0) {
    const panelCount = () => this.#panels.length;
    this.scroll = new TweenClock(initialPanel, panelCount);
    this.immediate = new TweenClock(initialPanel, panelCount);
  }

  /**
   * Push the latest scroll state into both clocks. This is the only place the
   * controller mutates anything, driven by a single `$effect` in `CustomGlobe`.
   */
  sync(input: TweenSyncInput): void {
    this.#panels = input.panels;

    const segTo = Math.min(input.currentPanel + 1, input.panels.length - 1);
    this.#mode = input.panels[segTo]?.data.animationMode ?? 'scroll';
    const duration = input.panels[segTo]?.data.animationDuration ?? DEFAULT_IMMEDIATE_DURATION_MS;

    const base = {
      currentPanel: input.currentPanel,
      virtualPanel: input.virtualPanel,
      panelPct: input.panelPct,
      panelCount: input.panels.length
    };
    const reduced = prefersReducedMotionNow();

    this.scroll.set(computeDesiredPosition({ ...base, mode: 'scroll' }), {
      duration: reduced || input.isTouch ? 0 : SCROLL_SMOOTHING_MS,
      easing: cubicOut
    });
    this.immediate.set(computeDesiredPosition({ ...base, mode: 'immediate' }), {
      duration: reduced ? 0 : duration,
      easing: cubicInOut
    });
  }

  /** The clock for a given mode (`immediate`, else `scroll`). */
  clock(mode: AnimationMode): TweenClock {
    return mode === 'immediate' ? this.immediate : this.scroll;
  }

  /** Panels currently loaded. */
  get panels(): PanelDefinition<DecodedObject>[] {
    return this.#panels;
  }

  get panelCount(): number {
    return this.#panels.length;
  }

  /** Mode of the segment currently being entered. */
  get mode(): AnimationMode {
    return this.#mode;
  }

  // ---- single-clock API: delegates to the clock `animationMode` selects ----

  /** Continuous tween position, e.g. `2.37`. */
  get position(): number {
    return this.clock(this.#mode).position;
  }

  /** Lower index of the panel pair currently being blended. */
  get fromPanel(): number {
    return this.clock(this.#mode).fromPanel;
  }

  /** Upper index of the panel pair currently being blended. */
  get toPanel(): number {
    return this.clock(this.#mode).toPanel;
  }

  /** Linear blend factor between `fromPanel` and `toPanel` (0..1). */
  get t(): number {
    return this.clock(this.#mode).t;
  }

  /** `t` shaped by a cubic ease-in-out, for features that want an eased curve. */
  get easedT(): number {
    return this.clock(this.#mode).easedT;
  }

  get fromConfig(): DecodedObject {
    return this.#panels[this.fromPanel]?.data ?? EMPTY_CONFIG;
  }

  get toConfig(): DecodedObject {
    return this.#panels[this.toPanel]?.data ?? EMPTY_CONFIG;
  }

  // Interpolation helpers, also importable from ./utils.ts for tests and non-context callers.
  lerp = lerp;
  lerpColour = lerpColour;
  lerpCoords = lerpCoords;
}
