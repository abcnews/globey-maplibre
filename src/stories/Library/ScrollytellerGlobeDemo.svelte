<script lang="ts">
  import ScrollytellerGlobe from '../../components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
  import { parsePastedContent } from '../../components/PastedScrollyteller/parsePastedContent.ts';
  import { MARKER_NAME } from '../../lib/constants.ts';
  import { demoBlob as blob } from './demoBlob.ts';
  import { sampleStoryText as storyText } from './sampleStory.ts';

  // In an article, `loadScrollyteller()` reads panels from the page DOM. Here the same
  // markers are parsed from plain text instead — the result is identical.
  const { panels } = parsePastedContent({ text: storyText, name: MARKER_NAME });
</script>

<ScrollytellerGlobe jsonBlob={blob} {panels} />
