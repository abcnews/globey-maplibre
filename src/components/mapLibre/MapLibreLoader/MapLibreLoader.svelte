<script lang="ts">
  import { onMount, setContext, untrack } from 'svelte';
  import { loadMapLibre } from '../utils.ts';
  import type { maplibregl } from '../maplibre.d.ts';
  import type { Snippet } from 'svelte';
  type Props = {
    rootElStyle?: string;
    onLoad: ({}: {
      rootNode: HTMLDivElement;
      maplibregl: typeof maplibregl;
    }) => maplibregl.Map | void | Promise<maplibregl.Map | void>;
    onTeardown?: () => void | Promise<void>;
    children?: Snippet;
  };
  const { rootElStyle = 'width:100%;height:100%;', onLoad, children }: Props = $props();
  let rootNode = $state<HTMLDivElement>();
  let status = $state<'loading' | 'loaded' | 'error'>('loading');
  let mapInstance = $state<{ map: maplibregl.Map | void }>({ map: undefined });
  setContext('mapInstance', mapInstance);

  onMount(async () => {
    await loadMapLibre().catch(e => {
      console.log('caught error');
      status = 'error';
    });
    if (status === 'error') {
      return;
    }
    if (!rootNode) {
      return;
    }
    const newMapInstance = await onLoad({
      rootNode,
      maplibregl: window.maplibregl
    });
    mapInstance.map = newMapInstance;
    status = 'loaded';
  });
</script>

<div class="maplibre maplibre--{status}" bind:this={rootNode} style={rootElStyle}>
  {@render children?.()}
  {#if status === 'error'}
    Could not load map.
  {/if}
</div>

<style>
  .maplibre {
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .maplibre--loaded,
  .maplibre--error {
    opacity: 1;
  }
</style>
