import { writable } from 'svelte/store';

/** Used in the builder to set the location without flyTo, e.g. in things like lon/lat sliders */
export const disableMapAnimation = writable(false);