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
    const decoded = await decodeObject(d, true);
    if (stringify(options) === stringify(decoded)) {
      return;
    }
    options = decoded;
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
</script>

{#if options}
  <Scrollyteller {panels} onMarker={setConfig} discardSlot={true} layout={LAYOUT}>
    <div class="container">
      {#if loading}
        <div class="loading"></div>
      {/if}
      <CustomGlobe {options} rootElStyle="width:100%;height:100vh" interactive={false} />
    </div>
  </Scrollyteller>
{/if}

<style type="scss">
  :global(#webpack-dev-server-client-overlay) {
    display: none !important;
  }
</style>
