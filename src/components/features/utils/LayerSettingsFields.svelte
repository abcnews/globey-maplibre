<script lang="ts">
  import { untrack } from 'svelte';
  import { jsonBlob } from '../../../lib/data/blobStore.ts';
  import { isLayerIdUnique, toLayerIdSlug } from './layerOps.ts';

  interface Props {
    /** 'immediate' = plays on arrival, holding until the panel is reached; unset/'scroll' = tied to scroll position */
    animationClock?: 'scroll' | 'immediate';
    /** Unique lowercase-alphanumeric layer id — also the Builder title and marker `LAYER<id>` token. */
    id?: string;
  }

  let { animationClock = $bindable(), id = $bindable('') }: Props = $props();

  // The id this layer had when the modal opened, so it doesn't count as a clash with itself.
  const originalId = untrack(() => id);
  const isUnique = $derived(isLayerIdUnique($jsonBlob?.layers ?? [], id ?? '', originalId));

  function setClock(mode: 'scroll' | 'immediate') {
    animationClock = mode === 'immediate' ? 'immediate' : undefined;
  }

  // Strips anything outside a-z0-9 and forces lowercase as the reader types, so the id is
  // always well-formed. Empty/duplicate ids are reverted on commit by `handleCloseLayerModal`.
  function handleIdInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    id = toLayerIdSlug(input.value);
    input.value = id;
  }
</script>

<fieldset>
  <legend>Animation Clock</legend>
  <div style:display="flex" style:gap="1rem">
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="layer-clock-mode"
        value="scroll"
        checked={animationClock !== 'immediate'}
        onchange={() => setClock('scroll')}
      />
      Tied to scroll
    </label>
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="layer-clock-mode"
        value="immediate"
        checked={animationClock === 'immediate'}
        onchange={() => setClock('immediate')}
      />
      Animate on arrival
    </label>
  </div>
  <small class="help-text">
    Scroll-tied layers fade in as the reader scrolls. Arrival layers hold until the panel is reached, then play over the
    panel's animation duration.
  </small>
</fieldset>

<fieldset>
  <legend>Layer ID</legend>
  <div class="field-group">
    <label for="layer-id">Identifier / marker token</label>
    <input id="layer-id" type="text" placeholder="e.g. fires" value={id} oninput={handleIdInput} />
    {#if !id}
      <small class="error-text">Layer ID cannot be empty — the previous ID will be kept.</small>
    {:else if !isUnique}
      <small class="error-text">This Layer ID is already in use — the previous ID will be kept.</small>
    {:else}
      <small class="help-text">Lowercase letters and numbers only (a-z, 0-9). Used in markers, e.g. LAYER{id}on.</small>
    {/if}
  </div>
</fieldset>

<style>
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .error-text {
    font-size: 0.75rem;
    color: var(--error, #c62828);
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }
</style>
