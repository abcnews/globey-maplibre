<script lang="ts">
  import { untrack } from 'svelte';
  import { jsonBlob } from '../../../lib/data/blobStore.ts';
  import { isLayerIdUnique, toLayerIdSlug } from './layerOps.ts';

  interface Props {
    /** Unique lowercase-alphanumeric layer id — also the Builder title and marker `LAYER<id>` token. */
    id?: string;
    /** Text for the field's label. */
    label?: string;
    /** Show the note about allowed characters and the marker token. Errors always show. */
    showHelp?: boolean;
  }

  let { id = $bindable(''), label = 'Identifier / marker token', showHelp = true }: Props = $props();

  // The id this layer had when the modal opened, so it doesn't count as a clash with itself.
  const originalId = untrack(() => id);
  const isUnique = $derived(isLayerIdUnique($jsonBlob?.layers ?? [], id ?? '', originalId));

  // Strips anything outside a-z0-9 and forces lowercase as the reader types, so the id is
  // always well-formed. Empty/duplicate ids are reverted on commit by `handleCloseLayerModal`.
  function handleIdInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    id = toLayerIdSlug(input.value);
    input.value = id;
  }
</script>

<label>
  <span>{label}</span>
  <input type="text" placeholder="e.g. fires" value={id} oninput={handleIdInput} />
  {#if !id}
    <small class="error-text">Layer ID cannot be empty — the previous ID will be kept.</small>
  {:else if !isUnique}
    <small class="error-text">This Layer ID is already in use — the previous ID will be kept.</small>
  {:else if showHelp}
    <small class="help-text">Lowercase letters and numbers only (a-z, 0-9). Used in markers, e.g. LAYER{id}on.</small>
  {/if}
</label>

<style>
  span {
    font-size: 0.85rem;
    font-weight: 500;
  }

  small {
    display: block;
    font-size: 0.75rem;
  }

  .error-text {
    color: var(--error, #c62828);
  }

  .help-text {
    color: var(--text-light, #888);
  }
</style>
