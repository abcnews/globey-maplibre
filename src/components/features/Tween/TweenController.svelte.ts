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
  #target: number;
  #duration: number;

  constructor(initialPanel: number, panelCount: () => number) {
    this.#position = new Tween(initialPanel);
    this.#panelCount = panelCount;
    this.#target = initialPanel;
    this.#duration = 0;
  }

  /** Retarget the clock. Called by `TweenController.sync()` once per tick. */
  set(target: number, opts: { duration: number; easing?: (t: number) => number }): void {
    // Avoid restarting Svelte's Tween if target and duration haven't changed,
    // which resets elapsed time to 0 and freezes animations on scroll frames.
    if (
      this.#target === target &&
      this.#duration === opts.duration &&
      (opts.duration > 0 || this.#position.current === target)
    ) {
      return;
    }

    this.#target = target;
    this.#duration = opts.duration;
    this.#position.set(target, opts);
  }

  /** Target index the clock is currently animating towards. */
  get target(): number {
    return this.#target;
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
 * The panel's `animationMode` (`am`) selects which one the single-clock getters
 * below follow — that is the camera's clock. Individual layers pick their own
 * via `animationClock` (`ac`) and read the matching global-state key directly.
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
    const activePanelMode = input.panels[input.currentPanel]?.data.animationMode;
    this.#mode = activePanelMode === 'immediate' ? 'immediate' : (input.panels[segTo]?.data.animationMode ?? 'scroll');

    const base = {
      currentPanel: input.currentPanel,
      virtualPanel: input.virtualPanel,
      panelPct: input.panelPct,
      panelCount: input.panels.length
    };
    const reduced = prefersReducedMotionNow();

    const scrollTarget = computeDesiredPosition({ ...base, mode: 'scroll' });
    const immediateTarget = computeDesiredPosition({ ...base, mode: 'immediate' });
    const immediateFrom = this.immediate.position;
    const immediateDuration = input.panels[immediateTarget]?.data.animationDuration ?? DEFAULT_IMMEDIATE_DURATION_MS;

    this.scroll.set(scrollTarget, {
      duration: reduced || input.isTouch ? 0 : SCROLL_SMOOTHING_MS,
      easing: cubicOut
    });
    this.immediate.set(immediateTarget, {
      duration: reduced ? 0 : immediateDuration,
      easing: cubicInOut
    });
  }

  /** The clock for a given mode (`immediate`, else `scroll`). */
  clock(mode: AnimationMode): TweenClock {
    return mode === 'immediate' ? this.immediate : this.scroll;
  }

  /**
   * The literal numeric position for one clock, shaped the same way `CustomGlobe` writes it into
   * MapLibre's global-state (`scroll` blends via `fromPanel + easedT`, `immediate` is read raw —
   * see `CustomGlobe.svelte`'s write effect for why). Reusable by anything that needs the tween
   * value as a plain JS number rather than a `global-state` paint expression, e.g. a paint
   * property MapLibre requires a literal for.
   */
  positionFor(mode: AnimationMode, reducedMotion: boolean): number {
    if (this.panelCount === 0) return 0;

    const clock = this.clock(mode);
    if (reducedMotion) return clock.fromPanel;

    const shaped = mode === 'immediate' ? clock.position : clock.fromPanel + clock.easedT;
    return Math.min(Math.max(shaped, 0), Math.max(this.panelCount - 1, 0));
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
