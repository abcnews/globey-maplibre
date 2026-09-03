import { createContext } from 'svelte';
import type { TweenController } from './TweenController.svelte.ts';

/**
 * Typed accessor pair for the shared {@link TweenController}.
 *
 * `CustomGlobe` calls `setTween(controller)` during init; any descendant feature
 * handler that wants to animate calls `getTween()`. Handlers that don't care
 * about tweening simply never call it.
 */
export const [getTween, setTween] = createContext<TweenController>();
