<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import BuilderFirstrun from './Builder.firstrun.svelte';
  import BuilderLayers from './Builder.layers.svelte';
  import BuilderMarkers from './Builder.markers.svelte';
  import BuilderPastedScrollyteller from './Builder.pastedScrollyteller.svelte';
  import Favicon from './Favicon/Favicon.svelte';
  import { BuilderStyleRoot } from '@abcnews/components-builder';

  /**
   * Router determines whether a project JSON blob is active.
   * If jsonBlob exists, render Builder.layers/Builder.markers/Builder.pastedScrollyteller
   * depending on the active mode. Otherwise, render Builder.firstrun to prompt user.
   */
  const hasBlob = $derived($jsonBlob !== null);

  type Mode = 'layout' | 'markers' | 'paste';

  /** Marker Mode's own ACTO string always starts with `mark` (see Builder.markers.svelte),
   *  so the hash itself is the source of truth for which mode we're in — no separate,
   *  independently-persisted mode flag to fall out of sync with it. `#paste` is a test
   *  harness (see Builder.pastedScrollyteller.svelte) — deliberately not exposed in
   *  ModeSwitcher, reach it by typing the hash directly. */
  function modeFromHash(hash: string): Mode {
    const clean = hash.replace(/^#/, '');
    if (clean.startsWith('mark')) return 'markers';
    if (clean.startsWith('paste')) return 'paste';
    return 'layout';
  }

  let currentHash = $state(window.location.hash);
  const activeMode = $derived(modeFromHash(currentHash));

  function setMode(mode: Mode) {
    if (mode === modeFromHash(window.location.hash)) return;
    window.location.hash = mode === 'markers' ? 'mark' : '';
    currentHash = window.location.hash;
  }

  function onHashChange() {
    currentHash = window.location.hash;
  }
</script>

<svelte:window onhashchange={onHashChange} />
<Favicon />

{#snippet ModeSwitcher()}
  <div class="mode-switcher">
    <button type="button" class:selected={activeMode === 'layout'} onclick={() => setMode('layout')}>
      Layout
    </button>
    <button type="button" class:selected={activeMode === 'markers'} onclick={() => setMode('markers')}>
      Markers
    </button>
  </div>
{/snippet}

<BuilderStyleRoot>
  {#if hasBlob}
    {#if activeMode === 'layout'}
      <BuilderLayers {ModeSwitcher} />
    {:else if activeMode === 'markers'}
      <BuilderMarkers {ModeSwitcher} />
    {:else}
      <BuilderPastedScrollyteller {ModeSwitcher} />
    {/if}
  {:else}
    <BuilderFirstrun />
  {/if}
</BuilderStyleRoot>

<style>
  .mode-switcher {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .mode-switcher button {
    flex: 1;
    padding: 0.4rem 0.9rem;
    border: none;
    border-radius: 3px;
    background: var(--background-alt, #2c2c2f);
    color: var(--text-light, #888);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .mode-switcher button.selected {
    background: var(--builder-color-primary, #007bff);
    color: #fff;
  }
</style>
