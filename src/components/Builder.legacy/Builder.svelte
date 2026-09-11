<script lang="ts">
  import { BuilderStyleRoot, UpdateChecker, MarkerAdmin, Loader, BuilderFrame } from '@abcnews/components-builder';
  import { onMount } from 'svelte';
  import { markerSchema, type DecodedObject } from '../../lib/marker';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import type * as maplibregl from 'maplibre-gl';
  import { options } from './store';
  import PropCoord from './PropCoord.svelte';
  import PropBase from './PropBase/PropBase.svelte';
  import PropLayers from './Layers/PropLayers.svelte';
  import MarkerJson from './MarkerJson.svelte';
  import IframeUrl from './IframeUrl.svelte';
  import PropScreenshot from './PropScreenshotTool/PropScreenshot.svelte';
  import Favicon from './Favicon/Favicon.svelte';
  import PastedScrollyteller from '../PastedScrollyteller/PastedScrollyteller.svelte';

  let currentSearch = $state(typeof window !== 'undefined' ? window.location.search : '');

  const isPastedMode = $derived(
    (() => {
      const params = new URLSearchParams(currentSearch);
      return params.get('tool') === 'pasted' || params.get('mode') === 'scrollyteller' || params.has('pasted');
    })()
  );

  let map = $state<maplibregl.Map>();

  let lastEncodedHash = '';

  $effect(() => {
    if (!$options) {
      return;
    }
    const currentOptions = $state.snapshot($options);
    markerSchema.encode(currentOptions).then(hash => {
      const newHash = hash || '';
      if (window.location.hash.slice(1) !== newHash) {
        lastEncodedHash = newHash;
        window.location.hash = newHash;
      }
    });
  });

  async function updateHash() {
    const currentHash = window.location.hash.slice(1);
    if (currentHash && currentHash === lastEncodedHash) {
      return;
    }
    lastEncodedHash = currentHash;
    const urlOptions = await markerSchema.decode(currentHash);
    $options = urlOptions;
  }

  onMount(updateHash);

  $effect(() => {
    if (!map) {
      return;
    }
    const onMoveEnd = (e: any) => {
      // Only update options if the move was triggered by user interaction
      // Cast to any because builderInitiated is a custom property we added
      if (!e.originalEvent && !(e as any).builderInitiated) {
        return;
      }

      const center = e.target.getCenter();
      $options = {
        ...$options,
        coords: [center.lng, center.lat],
        z: e.target.getZoom()
      };
    };

    map.on('moveend', onMoveEnd);
    return () => map?.off('moveend', onMoveEnd);
  });
</script>

<svelte:window
  onhashchange={updateHash}
  onpopstate={() => {
    currentSearch = window.location.search;
  }}
/>
<Favicon />

{#if isPastedMode}
  <PastedScrollyteller
    onBackToBuilder={() => {
      currentSearch = window.location.search;
    }}
  />
{:else}
  {#snippet Viz()}
    <div class="frame">
      {#if $options.coords}
        <CustomGlobe interactive={true} options={$options} preserveDrawingBuffer={true} onLoad={loadedMap => (map = loadedMap)} />
      {/if}
    </div>
  {/snippet}

  {#snippet Sidebar()}
    {#if !map || !$options}
      <Loader></Loader>
    {/if}

    {#if map && $options}
      <PropBase {map} />
      <PropCoord {map} />
      <PropLayers {map} />

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
        <MarkerJson />
        <PropScreenshot {map} />
        <button
          type="button"
          onclick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('tool', 'pasted');
            window.history.pushState({}, '', url.toString());
            currentSearch = window.location.search;
          }}>Pasted scrollyteller</button
        >
      </fieldset>
    {/if}
    <UpdateChecker />
  {/snippet}

  {#if $options}
    <BuilderStyleRoot>
      <BuilderFrame {Viz} {Sidebar} />
    </BuilderStyleRoot>
  {/if}
{/if}

<style lang="scss">
  .frame {
    width: 100%;
    height: 100%;
    border: 0;
    position: relative;
  }
</style>
