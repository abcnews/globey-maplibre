<script lang="ts">
  import { BuilderStyleRoot, BuilderFrame, UpdateChecker } from '@abcnews/components-builder';
  import { onMount } from 'svelte';
  import { decodeFragment, encodeFragment, type DecodedObject } from '../../lib/marker';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import type { maplibregl } from '../mapLibre/index';
  import { options as optionsStore } from './store';
  import PropCoord from './PropCoord.svelte';
  import PropBounds from './PropBounds.svelte';

  let options = $state<DecodedObject>({});
  let map = $state<maplibregl.Map>();

  onMount(async () => {
    const urlOptions = await decodeFragment(window.location.hash.slice(1));
    console.log({ urlOptions });
    options = urlOptions;
  });

  $effect(() => {
    $optionsStore = options;
  });

  $effect(() => {
    if (!options) {
      return;
    }
    encodeFragment(options).then(hash => {
      window.location.hash = hash;
    });
  });

  function onLoad(loadedMap) {
    map = loadedMap;
  }
  $effect(() => {
    if (!map) {
      return;
    }
    map.on('moveend', e => {
      // Only update options if the move was triggered by user interaction
      if (!e.originalEvent || !options) {
        return;
      }

      const center = e.target.getCenter();
      options.coords = [center.lng, center.lat];
      options.z = e.target.getZoom();
    });
  });
</script>

{#snippet Viz()}
  <div class="frame">
    {#if options.coords}
      <CustomGlobe interactive={true} {options} {onLoad} />
    {/if}
  </div>
{/snippet}

{#snippet Sidebar()}
  {#if map && options}
    <PropCoord {map} onchange={coords => (options.coords = coords)} />
    <PropBounds {map} onchange={bounds => (options.bounds = bounds)} />
  {/if}
  <UpdateChecker />
{/snippet}

{#if options}
  <BuilderStyleRoot>
    <BuilderFrame {Viz} {Sidebar} />
  </BuilderStyleRoot>
{/if}

<style lang="scss">
  .frame {
    width: 100%;
    height: 100%;
    border: 0;
    position: relative;
  }
  :global(#webpack-dev-server-client-overlay) {
    display: none !important;
  }
</style>
