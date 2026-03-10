import { writable } from 'svelte/store';

/** Used in the builder to set the location without flyTo, e.g. in things like lon/lat sliders */
export const disableMapAnimation = writable(false);

const isBrowser = typeof window !== 'undefined';

/** Does the user prefer reduced motion, or have they toggled it with interactive-plugins */
export const prefersReducedMotion = writable(
  isBrowser &&
    (document.body.classList.contains('is-reduced-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
);

if (isBrowser) {
  // Watch for class changes on body
  const bodyObserver = new MutationObserver(() => {
    const hasClass = document.body.classList.contains('is-reduced-motion');
    const hasMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    prefersReducedMotion.set(hasClass || hasMediaQuery);
  });
  bodyObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  // Watch for system preference changes
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', () => {
    const hasClass = document.body.classList.contains('is-reduced-motion');
    prefersReducedMotion.set(hasClass || mediaQuery.matches);
  });
}
