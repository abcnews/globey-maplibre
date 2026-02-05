<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { loadThreeJS } from './utils.ts';
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
  };

  const { children }: Props = $props();

  let status = $state<'loading' | 'loaded'>('loading');
  let threeInstance = $state<{ module: any }>({ module: undefined });

  setContext('threeInstance', threeInstance);

  onMount(async () => {
    try {
      const module = await loadThreeJS();
      threeInstance.module = module;
      status = 'loaded';
    } catch (e) {
      console.error('Failed to load ThreeJS', e);
    }
  });
</script>

{#if status === 'loaded'}
  {@render children?.()}
{/if}
