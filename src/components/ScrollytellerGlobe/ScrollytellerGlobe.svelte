<script lang="ts">
  import Scrollyteller from '@abcnews/svelte-scrollyteller';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { onMount } from 'svelte';
  import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
  import type { DecodedObject } from '../../lib/marker';

  interface Props {
    /** Scrollyteller panels with pre-decoded marker options in panel.data */
    panels: PanelDefinition<DecodedObject>[];
    /** Optional callback invoked when active marker changes */
    onMarker?: (marker: DecodedObject) => void;
  }

  let { panels, onMarker }: Props = $props();
  let currentPanel = $state(0);
  let virtualPanel = $state(-1);
  let panelPct = $state(0);
  let scrollPct = $state(0);
  let scrollDelta = $state(-6);
  let options = $derived(panels[currentPanel]?.data || panels[0]?.data);

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
        {panels}
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
{/if}

<style type="scss">
  .container {
    width: 100%;
    height: 100%;
  }
</style>
