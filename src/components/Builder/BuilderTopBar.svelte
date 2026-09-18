<script lang="ts">
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import { Search } from 'svelte-bootstrap-icons';
  import { Modal, BuilderStyleRoot } from '@abcnews/components-builder';
  import GeoSearch from '../Builder.legacy/GeoSearch/GeoSearch.svelte';
  import { safeFlyTo } from './utils.ts';

  type Mode = 'newmap' | 'layout' | 'markers' | 'paste';

  interface Props {
    /** Which step is currently active. */
    activeMode: Mode;
    /** Whether a JSON blob is loaded — gates the Markers & Preview steps. */
    hasBlob: boolean;
    /** Shared MapLibre instance for the active mode, if any — drives the location search. */
    map?: MapLibreMap;
    /** Navigate to a given step. */
    onSetMode: (mode: Mode) => void;
  }

  let { activeMode, hasBlob, map, onSetMode }: Props = $props();

  const steps: { mode: Mode; number: number; label: string }[] = [
    { mode: 'newmap', number: 1, label: 'New map' },
    { mode: 'layout', number: 2, label: 'Layers' },
    { mode: 'markers', number: 3, label: 'Markers' },
    { mode: 'paste', number: 4, label: 'Preview scrollyteller' }
  ];

  const showSearch = $derived(activeMode === 'layout' || activeMode === 'markers');

  let isSearchModalOpen = $state(false);

  function isDisabled(mode: Mode) {
    return (mode === 'markers' || mode === 'paste') && !hasBlob;
  }

  function onGeoSelect(result: { name: string; coords: [number, number] }) {
    if (map) {
      safeFlyTo(map, { center: result.coords, zoom: Math.max(map.getZoom(), 6) });
    }
    isSearchModalOpen = false;
  }
</script>

<div class="top-bar">
  <div class="steps">
    {#each steps as step, i (step.mode)}
      <button
        type="button"
        class="step"
        class:selected={activeMode === step.mode}
        style:z-index={steps.length - i}
        disabled={isDisabled(step.mode)}
        onclick={() => onSetMode(step.mode)}
      >
        <span class="step-number">{step.number}</span>
        {step.label}
      </button>
    {/each}
  </div>

  {#if showSearch}
    <button
      type="button"
      class="btn-icon search-button"
      aria-label="Search location"
      title="Search location"
      disabled={!map}
      onclick={() => (isSearchModalOpen = true)}
    >
      <Search />
    </button>
  {/if}
</div>

{#if isSearchModalOpen}
  <BuilderStyleRoot>
    <Modal onClose={() => (isSearchModalOpen = false)} title="Search Location">
      <div class="search-modal-content">
        <GeoSearch onselect={onGeoSelect} autofocus />
      </div>
    </Modal>
  </BuilderStyleRoot>
{/if}

<style>
  .top-bar {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    height: 2.75rem;
    padding-left: 0.75rem;
    background: var(--background-alt, #2c2c2f);
    border-bottom: 1px solid var(--border, #444);
    flex-shrink: 0;
  }

  .steps {
    display: flex;
    align-items: stretch;
  }

  .search-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    border: none;
    border-left: 1px solid var(--border, #444);
    background: transparent;
    color: var(--text-light, #888);
    cursor: pointer;
    flex-shrink: 0;
  }

  .search-button:hover:not(:disabled) {
    color: #fff;
  }

  .search-button:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .search-modal-content {
    width: 90vw;
    max-width: 32rem;
    min-height: 24rem;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0;
    box-sizing: border-box;
  }

  /* Right-pointing arrow/chevron steps: a point on the right edge and a matching
     notch on the left edge, so consecutive steps interlock like a breadcrumb. The
     first step has a flat left edge since there's nothing to notch into. */
  .step {
    --notch: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    padding: 0 1.1rem 0 calc(0.9rem + var(--notch));
    margin-left: calc(-1 * var(--notch));
    background: var(--background, #1c1c1e);
    color: var(--text-light, #888);
    cursor: pointer;
    font-size: 0.85rem;
    white-space: nowrap;
    clip-path: polygon(
      0 0,
      calc(100% - var(--notch)) 0,
      100% 50%,
      calc(100% - var(--notch)) 100%,
      0 100%,
      var(--notch) 50%
    );
  }

  .step:first-child {
    margin-left: 0;
    padding-left: 0.9rem;
    clip-path: polygon(0 0, calc(100% - var(--notch)) 0, 100% 50%, calc(100% - var(--notch)) 100%, 0 100%);
  }

  .step:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .step.selected {
    background: var(--builder-color-primary, #007bff);
    color: #fff;
  }

  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    font-size: 0.7rem;
    font-weight: 600;
  }
</style>
