<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ScrollytellerGlobeDemo from './ScrollytellerGlobeDemo.svelte';

  const { Story } = defineMeta({
    title: 'Library/ScrollytellerGlobe',
    component: ScrollytellerGlobeDemo,
    parameters: { layout: 'fullscreen' }
  });
</script>

<!-- Scroll to step through day→night, labels, a GeoJSON area, a drawn line and a recoloured point layer. -->
<Story name="Panels and transitions" />
