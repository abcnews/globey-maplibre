<script lang="ts">
  import { onMount } from 'svelte';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { decodeFragment } from '../../lib/marker.ts';
  import { emitResize } from '../../lib/iframe.ts';
  import type { DecodedObject } from '../../lib/marker/types.ts';

  let settings = $state<DecodedObject | null>(null);
  let container = $state<HTMLElement | null>(null);

  /**
   * Get ratio from query params or defaults
   */
  const getRatios = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mobile = urlParams.get('ratio-mobile') || '3:4';
    const desktop = urlParams.get('ratio-desktop') || '4:3';

    // Convert '3:4' to '3/4' for CSS aspect-ratio
    return {
      mobile: mobile.replace(':', '/'),
      desktop: desktop.replace(':', '/')
    };
  };

  const ratios = getRatios();
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  onMount(() => {
    const init = async () => {
      // Initialise settings from hash
      const hash = window.location.hash.slice(1);
      settings = await decodeFragment(hash);
    };

    init();

    // Listen for hash changes if needed, though usually iframe is static
    const handleHashChange = async () => {
      const newHash = window.location.hash.slice(1);
      settings = await decodeFragment(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  // Emit resize events when the container height changes
  $effect(() => {
    if (container) {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          emitResize(entry.contentRect.height);
        }
      });
      observer.observe(container);
      return () => observer.disconnect();
    }
  });
</script>

<svelte:head>
  <style>
    /* Reset page styles to be flush */
    html,
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
    }
  </style>
</svelte:head>

<div
  bind:this={container}
  class="iframe-container"
  class:is-iframe={isIframe}
  style="--ratio-mobile: {ratios.mobile}; --ratio-desktop: {ratios.desktop};"
>
  {#if settings}
    <CustomGlobe options={settings} interactive={true} />
  {/if}
</div>

<style>
  .iframe-container {
    width: 100%;
    height: 100vh;
  }

  .iframe-container.is-iframe {
    height: auto;
    /* Default mobile ratio */
    aspect-ratio: var(--ratio-mobile);
  }

  /* Responsive ratio for desktop */
  @media (min-width: 640px) {
    .iframe-container.is-iframe {
      height: auto;
      aspect-ratio: var(--ratio-desktop);
    }
  }
</style>
