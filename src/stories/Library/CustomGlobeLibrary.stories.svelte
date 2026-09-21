<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CustomGlobeDemo from './CustomGlobeDemo.svelte';

  const { Story } = defineMeta({
    title: 'Library/CustomGlobe',
    component: CustomGlobeDemo,
    parameters: { layout: 'fullscreen' }
  });
</script>

<!-- Every layer on: rasters, GeoJSON areas/lines/points and custom labels. Click to toggle. -->
<Story name="Toggle layers" />

<!-- Only GeoJSON loaded from /test-topojson.json -->
<Story name="GeoJSON only" args={{ initialLayerIds: ['qld', 'route', 'islands'] }} />

<!-- Custom labels over night imagery -->
<Story name="Custom labels" args={{ initialLayerIds: ['night', 'states'] }} />
