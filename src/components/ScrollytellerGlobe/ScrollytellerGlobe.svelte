<script lang="ts">
  import Scrollyteller from '@abcnews/svelte-scrollyteller';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { onMount } from 'svelte';
  import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
  import type { DecodedObject } from '../../lib/marker';
  import type { GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';
  import { blobToDecodedObject } from '../../lib/data/blobAdapter.ts';
  import { applyMarkerOverrides } from '../../lib/data/markerPreview.ts';
  import { markerConfigFromParsed } from '../../lib/data/marker.ts';
  import type { Map } from 'maplibre-gl';
  import type { CustomLayerRegistration } from '../../lib/plugins/types.ts';

  interface Props {
    /** The master layer set every panel's marker overrides are applied against. */
    jsonBlob: GlobeJsonBlob;
    /** Scrollyteller panels as returned by `loadScrollyteller` — each panel.data is
     *  already an ACTO-parsed marker object (see `markerConfigFromParsed`), not a raw string. */
    panels: PanelDefinition<Record<string, any>>[];
    /** Optional callback invoked when active marker changes */
    onMarker?: (marker: DecodedObject) => void;
    /** Called with the MapLibre map instance as soon as it's constructed, before its style has loaded. */
    onmap?: (map: Map) => void;
    /** Consumer-defined custom layers, mounted once the map is ready. */
    plugins?: CustomLayerRegistration[];
  }

  let { jsonBlob, panels, onMarker, onmap, plugins }: Props = $props();
  let currentPanel = $state(0);
  let virtualPanel = $state(-1);
  let panelPct = $state(0);
  let scrollPct = $state(0);
  let scrollDelta = $state(-6);

  // Derived state: master blob + each panel's parsed marker object -> one DecodedObject
  // per panel. Computed once here so every consumer (CM, Storybook, pasted content) can
  // just hand over a blob and marker panels without knowing how they combine.
  const baseOptions = $derived(blobToDecodedObject(jsonBlob));
  const decodedPanels = $derived(
    panels.map(panel => ({ ...panel, data: applyMarkerOverrides(baseOptions, markerConfigFromParsed(panel.data)) }))
  );

  let options = $derived(decodedPanels[currentPanel]?.data || decodedPanels[0]?.data);

  $effect(() => {
    if (options && onMarker) {
      onMarker(options);
    }
  });

  let loading = $state(false);
  onMount(() => {
    // Delay the spinner so only slow devices will see it
    const timer = setTimeout(() => {
      loading = true;
    }, 1200);
    return () => clearTimeout(timer);
  });
  console.log('component mountising');
</script>

{#if options}
  <Scrollyteller
    {panels}
    bind:currentPanel
    bind:virtualPanel
    bind:panelPct
    bind:scrollPct
    bind:scrollDelta
    layout={{ resizeInteractive: false }}
  >
    <div class="container">
      {#if loading}
        <div class="loading"></div>
      {/if}
      <CustomGlobe
        {options}
        panels={decodedPanels}
        {currentPanel}
        {virtualPanel}
        {panelPct}
        {scrollPct}
        {scrollDelta}
        {onmap}
        {plugins}
        rootElStyle="width:100%;height:100%"
        interactive={false}
      />
    </div>
  </Scrollyteller>
{/if}

<style type="scss">
  .container {
    width: 100%;
    height: 100%;
  }
</style>
