<script lang="ts">
  import Scrollyteller from '@abcnews/svelte-scrollyteller';
  import { decodeObject } from '../../lib/marker';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { onMount } from 'svelte';

  let { panels } = $props();
  let options = $state();

  const setConfig = async d => {
    options = await decodeObject(d, true);
  };

  let loading = $state(false);
  onMount(() => {
    decodeObject(panels[0]?.data, true).then(decodedOptions => {
      options = decodedOptions;
    });

    // Delay the spinner so only slow devices will see it
    setTimeout(() => {
      loading = true;
    }, 1200);
  });

  $effect(() => {
    Promise.all(panels.map(p => decodeObject(p, true))).then(decodedPanels => {
      console.log({ decodedPanels });
    });
  });
</script>

<div class="scrolly-wrapper">
  {#if options}
    <Scrollyteller {panels} onMarker={setConfig} discardSlot={true}>
      <div class="container">
        {#if loading}
          <div class="loading"></div>
        {/if}
        <pre>Custom glob with:
{JSON.stringify(options, null, 2)}
</pre>
      </div>
    </Scrollyteller>
  {/if}
</div>

<style type="scss">
  :global(#webpack-dev-server-client-overlay) {
    display: none !important;
  }
  pre {
    max-width: 80vw;
    overflow: auto;
    max-height: 80vh;
  }
</style>
