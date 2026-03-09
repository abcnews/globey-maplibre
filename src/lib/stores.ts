import { writable } from 'svelte/store';

/** Used in the builder to set the location without flyTo, e.g. in things like lon/lat sliders */
export const disableMapAnimation = writable(false);

/** Does the user prefer reduced motion, or have they toggled it it with interactive-plugins */
export const prefersReducedMotion = writable(document.body.classList.contains('is-reduced-motion'));

const observer = new MutationObserver(function (event) {
  prefersReducedMotion.set(document.body.classList.contains('is-reduced-motion'));
});
observer.observe(document.body, {
  attributes: true,
  attributeFilter: ['class'],
  childList: false,
  characterData: false
});
