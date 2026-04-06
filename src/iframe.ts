import { decodeFragment } from './lib/marker';
import { CustomGlobe } from './lib/index';
import { mount } from 'svelte';

const decodedParams = await decodeFragment(window.location.hash.slice(1));

console.log({ decodedParams });

mount(CustomGlobe, {
  target: document.body,
  props: {
    options: decodedParams,
    interactive: false
  }
});
