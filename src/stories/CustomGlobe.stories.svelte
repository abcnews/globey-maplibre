<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CustomGlobe from '../components/CustomGlobe/CustomGlobe.svelte';

  const { Story } = defineMeta({
    title: 'Components/CustomGlobe',
    component: CustomGlobe,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen'
    },
    argTypes: {
      interactive: { control: 'boolean' },
      rootElStyle: { control: 'text' }
    }
  });
</script>

<!-- Basic interactive globe with default settings -->
<Story
  name="Default"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [133.8, -25.3],
      z: 3,
      projection: 'globe'
    }
  }}
/>

<!-- Non-interactive globe -->
<Story
  name="Non-interactive"
  args={{
    interactive: false,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [-0.1, 51.5],
      z: 4,
      projection: 'globe',
      base: 'street'
    }
  }}
/>

<!-- Satellite view: driven entirely by an explicit raster layer, not a base-map special case -->
<Story
  name="Satellite"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [120, 40],
      z: 3,
      projection: 'globe',
      rasterLayers: [
        {
          url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
          maxZoom: 7,
          tileSize: 256,
          attribution: 'NASA Blue Marble',
          darkTheme: true
        }
      ]
    }
  }}
/>

<!-- Testing fitGlobe functionality -->
<Story
  name="fitGlobe"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 800px;',
    options: {
      projection: 'globe',
      fitGlobe: {
        bounds: [
          [112.92, -43.68],
          [154.29, -10.05]
        ],
        padding: 100
      }
    }
  }}
/>
