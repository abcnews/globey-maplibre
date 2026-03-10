<script lang="ts">
  import { BuilderStyleRoot, UpdateChecker, MarkerAdmin, Loader, BuilderFrame } from '@abcnews/components-builder';
  import { onMount } from 'svelte';
  import { decodeFragment, encodeFragment, type DecodedObject } from '../../lib/marker';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import type { maplibregl } from '../mapLibre/index';
  import { options as optionsStore } from './store';
  import PropCoord from './PropCoord.svelte';
  import PropLabels from './PropLabels.svelte';
  import PropHighlightCountries from './HighlightCountries/PropHighlightCountries.svelte';
  import PropBase from './PropBase/PropBase.svelte';
  import PropGeoJSON from './GeoJSON/PropGeoJSON.svelte';
  import PropImageSource from './ImageSource/PropImageSource.svelte';
  import MarkerJson from './MarkerJson.svelte';
  import IframeUrl from './IframeUrl.svelte';
  import Favicon from './Favicon/Favicon.svelte';

  let options = $state<DecodedObject>({});
  let map = $state<maplibregl.Map>();

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

  async function updateHash() {
    const urlOptions = await decodeFragment(window.location.hash.slice(1));
    options = urlOptions;
  }
  onMount(updateHash);

  $effect(() => {
    if (!map) {
      return;
    }
    map.on('moveend', e => {
      // Only update options if the move was triggered by user interaction
      // Cast to any because builderInitiated is a custom property we added
      if (!e.originalEvent && !(e as any).builderInitiated) {
        return;
      }

      const center = e.target.getCenter();
      options.coords = [center.lng, center.lat];
      options.z = e.target.getZoom();
    });
  });
</script>

<svelte:window onhashchange={updateHash} />
<Favicon />

{#snippet Viz()}
  <div class="frame">
    {#if options.coords}
      <CustomGlobe interactive={true} {options} onLoad={loadedMap => (map = loadedMap)} />
    {/if}
  </div>
{/snippet}

{#snippet Sidebar()}
  {#if !map || !options}
    <Loader></Loader>
  {/if}

  {#if map && options}
    <PropBase {map} bind:options />
    <PropCoord
      {map}
      onchange={(coords, z) => {
        options.coords = coords;
        if (z !== undefined) options.z = z;
      }}
      onBoundsChange={bounds => {
        options.bounds = bounds;
        if (bounds.length > 0) {
          options.fitGlobe = false;
        }
      }}
      onFitGlobeChange={fitGlobe => {
        options.fitGlobe = fitGlobe;
        if (fitGlobe) {
          options.bounds = [];
        }
      }}
    />
    <PropLabels {map} onchange={labels => (options.labels = labels)} />
    <PropHighlightCountries
      {map}
      highlightCountries={options.highlightCountries}
      onchange={highlightCountries => (options.highlightCountries = highlightCountries)}
    />
    <PropGeoJSON {map} geoJsonList={options.geoJson || []} onchange={list => (options.geoJson = list)} />
    <PropImageSource {map} imageSources={options.imageSources || []} onchange={list => (options.imageSources = list)} />
    <MarkerAdmin
      prefixes={{
        Mark: '#mark',
        'Scrollyteller opener': '#scrollytellerNAMEglobey1'
      }}
    />
    <fieldset>
      <legend>Tools</legend>
      <div style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
        <input
          id="reduced-motion-toggle"
          type="checkbox"
          checked={document.body.classList.contains('is-reduced-motion')}
          onchange={e => {
            document.body.classList.toggle('is-reduced-motion', e.currentTarget.checked);
          }}
        />
        <label for="reduced-motion-toggle">Reduced motion preview</label>
      </div>
      <IframeUrl />
      <MarkerJson bind:options />
    </fieldset>
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
  // :global(#webpack-dev-server-client-overlay) {
  //   display: none !important;
  // }
</style>
