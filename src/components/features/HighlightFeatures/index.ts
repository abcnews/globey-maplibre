import type { LayerAddMenuItem } from '../types.ts';
import { Highlighter } from 'svelte-bootstrap-icons';
import BuilderHighlightFeaturesModal from './BuilderHighlightFeaturesModal.svelte';

export const highlightFeaturesMenuItem: LayerAddMenuItem = {
  id: 'highlightFeatures',
  label: 'Highlight Features',
  icon: Highlighter,
  CustomModal: BuilderHighlightFeaturesModal
};

export * from './featureSets.ts';
