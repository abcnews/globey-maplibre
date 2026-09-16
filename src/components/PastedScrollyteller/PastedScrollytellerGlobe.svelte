<script lang="ts">
  import { markerSchema, type DecodedObject } from '../../lib/marker';
  import Scrollyteller from '@abcnews/svelte-scrollyteller';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
  import { Loader } from '@abcnews/components-builder';

  // This dev-only "paste story text" tool still parses the old, self-contained
  // markerSchema format (each panel is fully independent, no shared blob) — it predates
  // and isn't part of the GlobeJsonBlob + ACTO marker refactor (see REFACTOR.md), so it
  // renders Scrollyteller/CustomGlobe directly rather than going through
  // ScrollytellerGlobe, which now expects a blob + ACTO marker text per panel.

  interface Props {
    /** Scrollyteller panels as parsed from the pasted content */
    panels: PanelDefinition<any>[];
    /** Callback when a marker becomes active */
    onMarker?: (data: any) => void;
  }

  let { panels, onMarker }: Props = $props();

  let decodedPanels = $state<PanelDefinition<DecodedObject>[] | null>(null);
  let currentPanel = $state(0);
  let virtualPanel = $state(-1);
  let panelPct = $state(0);
  let scrollPct = $state(0);
  let scrollDelta = $state(-6);
  let options = $derived(decodedPanels?.[currentPanel]?.data || decodedPanels?.[0]?.data);

  $effect(() => {
    if (!panels || panels.length === 0) {
      decodedPanels = [];
      return;
    }

    Promise.all(
      panels.map(async panel => ({
        ...panel,
        data: {
          ...(await markerSchema.decode(panel.data)),
          _name: panel.nodes[0]?.textContent || '',
          originalData: panel.data
        }
      }))
    ).then(res => {
      decodedPanels = res;
      if (res.length > 0 && onMarker) {
        onMarker(res[0].data);
      }
    });
  });
</script>

{#if decodedPanels && options}
  <Scrollyteller
    panels={decodedPanels}
    bind:currentPanel
    bind:virtualPanel
    bind:panelPct
    bind:scrollPct
    bind:scrollDelta
    layout={{ resizeInteractive: false }}
  >
    <div class="container">
      <CustomGlobe
        {options}
        panels={decodedPanels}
        {currentPanel}
        {virtualPanel}
        {panelPct}
        {scrollPct}
        {scrollDelta}
        rootElStyle="width:100%;height:100%"
        interactive={false}
      />
    </div>
  </Scrollyteller>
{:else}
  <Loader />
{/if}

<style>
  .container {
    width: 100%;
    height: 100%;
  }
</style>
