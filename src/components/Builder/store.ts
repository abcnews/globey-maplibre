import { writable } from 'svelte/store';
import type { DecodedObject } from '../../lib/marker';

export const options = writable<DecodedObject>();
