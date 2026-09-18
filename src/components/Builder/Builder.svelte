<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import BuilderFirstrun from './Builder.firstrun.svelte';
  import BuilderLayers from './Builder.layers.svelte';
  import BuilderMarkers from './Builder.markers.svelte';
  import BuilderPastedScrollyteller from './Builder.pastedScrollyteller.svelte';
  import BuilderTopBar from './BuilderTopBar.svelte';
  import Favicon from './Favicon/Favicon.svelte';
  import { BuilderStyleRoot } from '@abcnews/components-builder';

  /**
   * Router determines whether a project JSON blob is active.
   * If jsonBlob exists, render Builder.layers/Builder.markers/Builder.pastedScrollyteller
   * depending on the active mode. Otherwise, render Builder.firstrun to prompt user.
   */
  const hasBlob = $derived($jsonBlob !== null);

  type Mode = 'newmap' | 'layout' | 'markers' | 'paste';

  /** Marker Mode's own ACTO string always starts with `mark` (see Builder.markers.svelte),
   *  so the hash itself is the source of truth for which mode we're in — no separate,
   *  independently-persisted mode flag to fall out of sync with it. `#paste` is the
   *  pasted-scrollyteller preview (see Builder.pastedScrollyteller.svelte); `#new` is the
   *  first-run/"new map" screen (see Builder.firstrun.svelte), reachable at any time via
   *  BuilderTopBar's step 1, not just when there's no blob yet. */
  function modeFromHash(hash: string): Mode {
    const clean = hash.replace(/^#/, '');
    if (clean.startsWith('mark')) return 'markers';
    if (clean.startsWith('paste')) return 'paste';
    if (clean.startsWith('new')) return 'newmap';
    return 'layout';
  }

  function hashForMode(mode: Mode): string {
    if (mode === 'markers') return 'mark';
    if (mode === 'paste') return 'paste';
    if (mode === 'newmap') return 'new';
    return '';
  }

  let currentHash = $state(window.location.hash);
  const activeMode = $derived(modeFromHash(currentHash));

  function setMode(mode: Mode) {
    if (mode === modeFromHash(window.location.hash)) return;
    if (mode === 'newmap' && hasBlob && !confirm('Exit current session and return to first-run screen?')) {
      return;
    }
    window.location.hash = hashForMode(mode);
    currentHash = window.location.hash;
  }

  function onHashChange() {
    currentHash = window.location.hash;
  }

  /** Markers/Preview require a loaded blob — if one isn't loaded (e.g. a stale #mark/#paste
   *  hash from a previous session), snap back to the New map step so it's the one
   *  highlighted while Builder.firstrun.svelte is showing. */
  $effect(() => {
    if (!hasBlob && activeMode !== 'newmap') setMode('newmap');
  });
</script>

<svelte:window onhashchange={onHashChange} />
<Favicon />

<div class="app-shell">
  <BuilderTopBar {activeMode} {hasBlob} onSetMode={setMode} />

  <div class="builder-content">
    <BuilderStyleRoot>
      {#if activeMode === 'newmap' || !hasBlob}
        <BuilderFirstrun onsuccess={() => setMode('layout')} />
      {:else if activeMode === 'layout'}
        <BuilderLayers />
      {:else if activeMode === 'markers'}
        <BuilderMarkers />
      {:else}
        <BuilderPastedScrollyteller />
      {/if}
    </BuilderStyleRoot>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .builder-content {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  /* BuilderFrame (from @abcnews/components-builder) positions itself absolutely against
     the viewport (position: absolute; top: 0; height: 100vh) — override it to fill this
     container instead, so it sits below the top bar rather than overlapping it.
     Its sidebar column sets its own explicit height: 100vh independently of the frame's
     height, so it also needs overriding — otherwise it overflows the bottom of the
     viewport by the top bar's height even though the frame itself is sized correctly. */
  .builder-content :global(.builder-frame) {
    position: absolute;
    top: 0;
    height: 100%;
  }

  .builder-content :global(.builder-frame__sidebar) {
    height: 100%;
  }

  /* Builder.firstrun.svelte relies on percentage heights to vertically centre its
     content instead of BuilderFrame's absolute-positioning trick — give the
     BuilderStyleRoot wrapper an explicit height so that resolves correctly. */
  .builder-content :global(.builder-style-root) {
    height: 100%;
  }
</style>
