import { decodeFragment } from './lib/marker';
import { mount } from 'svelte';
import Builder from './components/Builder/Builder.svelte';

const decodedParams = await decodeFragment(window.location.hash.slice(1));

console.log({ decodedParams });

mount(Builder, {
  target: document.body,
  props: {}
});
