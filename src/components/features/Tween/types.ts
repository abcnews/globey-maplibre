/**
 * How the transition *into* a panel is played.
 *
 * - `scroll` — progress is tied to scroll position; stopping mid-scroll holds the
 *   tween in place (the historical camera behaviour).
 * - `immediate` — on reaching the panel the tween plays 0→1 over a fixed
 *   duration and cannot be paused partway; scrolling back plays it in reverse.
 */
export type AnimationMode = 'scroll' | 'immediate';
