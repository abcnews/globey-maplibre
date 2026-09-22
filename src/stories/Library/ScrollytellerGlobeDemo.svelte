<script lang="ts">
  import ScrollytellerGlobe from '../../components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
  import { parsePastedContent } from '../../components/PastedScrollyteller/parsePastedContent.ts';
  import { MARKER_NAME } from '../../lib/constants.ts';
  import { demoBlob as defaultBlob } from './demoBlob.ts';
  import { sampleStoryText as defaultStoryText } from './sampleStory.ts';
  import type { GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';

  interface Props {
    jsonBlob?: GlobeJsonBlob;
    storyText?: string;
  }

  let { jsonBlob = defaultBlob, storyText = defaultStoryText }: Props = $props();

  // In an article, `loadScrollyteller()` reads panels from the page DOM. Here the same
  // markers are parsed from plain text instead — the result is identical.
  const { panels } = $derived(parsePastedContent({ text: storyText, name: MARKER_NAME }));
</script>

<ScrollytellerGlobe {jsonBlob} {panels} />

