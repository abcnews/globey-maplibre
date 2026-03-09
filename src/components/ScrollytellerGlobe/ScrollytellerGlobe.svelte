<script lang="ts">
  import Scrollyteller from '@abcnews/svelte-scrollyteller';
  import { decodeObject } from '../../lib/marker';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { onMount } from 'svelte';
  import { stringify } from '@abcnews/alternating-case-to-object';

  const LAYOUT = { resizeInteractive: false };

  let { panels } = $props();
  let options = $state();

  const setConfig = async d => {
    console.log('[ScrollytellerGlobe] setConfig called', d);
    const decoded = await decodeObject(d, true);
    console.log('[ScrollytellerGlobe] decoded options', decoded);
    if (JSON.stringify(options) === JSON.stringify(decoded)) {
      console.log('[ScrollytellerGlobe] options same, skipping update');
      return;
    }
    console.log('[ScrollytellerGlobe] options different, updating');
    options = decoded;
  };

  $effect(() => {
    console.log('[ScrollytellerGlobe] options updated', options);
  });

  $effect(() => {
    console.log('[ScrollytellerGlobe] panels changed', panels);
  });

  let loading = $state(false);
  onMount(() => {
    console.log('[ScrollytellerGlobe] onMount');
    decodeObject(panels[0]?.data, true).then(decodedOptions => {
      console.log('[ScrollytellerGlobe] Initial options set from mount', decodedOptions);
      options = decodedOptions;
    });

    // Delay the spinner so only slow devices will see it
    setTimeout(() => {
      loading = true;
    }, 1200);

    return () => {
      console.log('[ScrollytellerGlobe] unmounting');
    };
  });
</script>

{#if options}
  {console.log('[ScrollytellerGlobe] Rendering Scrollyteller block, options is set') || ''}
  <Scrollyteller {panels} onMarker={setConfig} layout={LAYOUT}>
    <div class="container">
      {console.log('[ScrollytellerGlobe] Rendering container div') || ''}
      {#if loading}
        <div class="loading"></div>
      {/if}
      <CustomGlobe {options} rootElStyle="width:100%;height:100vh" interactive={false} />
    </div>
  </Scrollyteller>
{:else}
  {console.log('[ScrollytellerGlobe] options is NOT set, rendering nothing') || ''}
{/if}

<style type="scss">
  :global(#webpack-dev-server-client-overlay) {
    display: none !important;
  }
</style>
