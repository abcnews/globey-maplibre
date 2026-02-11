import { writable } from 'svelte/store';
import type { DecodedObject } from '../../../../interactive-globey-maplibre/src/lib/marker';

export const options = writable<DecodedObject>();
