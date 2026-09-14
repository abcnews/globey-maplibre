<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CustomGlobe from '../../components/CustomGlobe/CustomGlobe.svelte';

  const { Story } = defineMeta({
    title: 'Components/CustomGlobe/GeoJson',
    component: CustomGlobe,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen'
    }
  });
</script>

<!-- Areas (Polygon) - Queensland -->
<Story
  name="Areas"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [133.8, -25.3],
      z: 3,
      projection: 'globe',
      geoJson: [
        {
          id: 'areas-example',
          url: '/test-topojson.json',
          type: 'areas',
          colourMode: 'simple',
          colourConfig: { basicType: 'highlight' }
        }
      ]
    }
  }}
/>

<!-- Lines (LineString) - Between Adelaide and Darwin -->
<Story
  name="Lines"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [133.8, -25.3],
      z: 3,
      projection: 'globe',
      geoJson: [
        {
          id: 'lines-example',
          url: '/test-topojson.json',
          type: 'lines',
          colourMode: 'simple',
          colourConfig: { basicType: 'highlight' },
          lineWidth: { min: 2, max: 6 }
        }
      ]
    }
  }}
/>

<!-- Points (Point features) - Islands -->
<Story
  name="Points"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [133.8, -25.3],
      z: 3,
      projection: 'globe',
      geoJson: [
        {
          id: 'points-example',
          url: '/test-topojson.json',
          type: 'points',
          colourMode: 'simple',
          colourConfig: { basicType: 'highlight' },
          pointSize: { min: 4, max: 8 }
        }
      ]
    }
  }}
/>

<!-- Areas (No Base Map) - Queensland on clean background -->
<Story
  name="Areas (No Base Map)"
  args={{
    interactive: true,
    rootElStyle: 'width: 100%; height: 600px;',
    options: {
      coords: [133.8, -25.3],
      z: 3,
      projection: 'globe',
      hideOsm: true,
      geoJson: [
        {
          id: 'areas-no-map',
          url: '/test-topojson.json',
          type: 'areas',
          colourMode: 'simple',
          colourConfig: { basicType: 'highlight' }
        }
      ]
    }
  }}
/>
