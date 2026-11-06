<script lang="ts">
  import { X } from 'svelte-bootstrap-icons';
  import type { EmbeddedImage } from '../../../lib/data/jsonBlob.ts';
  import { DEFAULT_IMAGE_TYPES, DEFAULT_MAX_IMAGE_BYTES, readEmbeddedImage } from '../../../lib/embeddedImage.ts';

  interface Props {
    /** The stored image, or undefined when none is set. */
    value?: EmbeddedImage;
    /** Text for the field's label. */
    label?: string;
    /** Largest file accepted, in bytes. */
    maxBytes?: number;
    /** Accepted MIME types. */
    accept?: string[];
  }

  let {
    value = $bindable(),
    label = 'Image',
    maxBytes = DEFAULT_MAX_IMAGE_BYTES,
    accept = DEFAULT_IMAGE_TYPES
  }: Props = $props();

  let errorMessage = $state('');
  let isReading = $state(false);

  async function handleFileChange(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    errorMessage = '';
    isReading = true;
    value = await readEmbeddedImage(file, { maxBytes, accept }).catch((error: Error) => {
      errorMessage = error.message;
      return value;
    });
    isReading = false;
    // Cleared so choosing the same file again after resetting still fires `change`.
    input.value = '';
  }

  function reset() {
    value = undefined;
    errorMessage = '';
  }
</script>

<div class="image-upload">
  <span class="label">{label}</span>

  {#if value}
    <div class="preview">
      <img src={value.dataUri} alt={value.name ?? label} />
      <button type="button" class="reset" onclick={reset} aria-label="Remove image" title="Remove image">
        <X />
      </button>
    </div>
  {:else}
    <input type="file" accept={accept.join(',')} onchange={handleFileChange} disabled={isReading} />
  {/if}

  {#if errorMessage}
    <small class="error-text">{errorMessage}</small>
  {/if}
</div>

<style>
  .image-upload {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .preview {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: start;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px dashed var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
  }

  .preview img {
    max-width: 120px;
    max-height: 120px;
    object-fit: contain;
  }

  .reset {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
  }

  .error-text {
    color: var(--error, #c62828);
    font-size: 0.75rem;
  }
</style>
