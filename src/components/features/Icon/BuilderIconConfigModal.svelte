<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import { untrack } from 'svelte';
  import type { IconConfig } from '../../../lib/marker';
  import { loadImage, type ImageState } from '../../../lib/loadImage.ts';
  import CmidInput from '../../Builder/CmidInput/CmidInput.svelte';
  import LayerSettingsFields from '../LayerSettingsFields.svelte';

  interface Props {
    /** The IconConfig object being edited or drafted */
    config: Partial<IconConfig>;
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  let committedCmid = $state<number>(untrack(() => config.cmid || 0));
  let lng = $state<number>(untrack(() => config.coords?.[0] ?? 0));
  let lat = $state<number>(untrack(() => config.coords?.[1] ?? 0));
  let animationClock = $state(untrack(() => config.animationClock));
  let name = $state(untrack(() => config.name));

  let imageState = $state<ImageState>({ status: 'loading' });

  $effect(() => {
    if (!committedCmid || isNaN(committedCmid)) {
      imageState = { status: 'loading' };
      return;
    }

    const store = loadImage(committedCmid, { targetWidth: 256, includeAlt: true });
    const unsub = store.subscribe(val => {
      imageState = val;
    });

    return () => {
      unsub();
    };
  });

  function handleSave() {
    config.cmid = committedCmid;
    config.coords = [lng, lat];
    config.animationClock = animationClock;
    config.name = name;
    onclose?.();
  }

  function handleCancel() {
    onclose?.();
  }
</script>

<Modal title="Icon Configuration" onClose={handleCancel}>
  <div class="icon-modal">
    <CmidInput
      id="icon-cmid"
      label="CoreMedia ID (CMID)"
      bind:value={committedCmid}
      loading={imageState.status === 'loading' && Boolean(committedCmid)}
    />

    {#if imageState.status === 'loaded' && imageState.url}
      <div class="preview-container">
        <span class="label">Preview</span>
        <div class="preview-box">
          <img src={imageState.url} alt={imageState.alt || 'Icon preview'} />
        </div>
      </div>
    {:else if imageState.status === 'error'}
      <div class="preview-error">
        <small>Failed to load image: {imageState.error?.message}</small>
      </div>
    {/if}

    <div class="form-row coords-row">
      <div>
        <label for="icon-lng">Longitude</label>
        <input
          id="icon-lng"
          type="number"
          step="0.0001"
          bind:value={lng}
        />
      </div>
      <div>
        <label for="icon-lat">Latitude</label>
        <input
          id="icon-lat"
          type="number"
          step="0.0001"
          bind:value={lat}
        />
      </div>
    </div>

    <LayerSettingsFields bind:animationClock bind:name />
  </div>

  {#snippet footerChildren()}
    <button type="button" onclick={handleSave}>Save</button>
    <button type="button" onclick={handleCancel}>Cancel</button>
  {/snippet}
</Modal>

<style>
  .icon-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .coords-row {
    flex-direction: row;
    gap: 0.5rem;
  }

  .coords-row > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  label,
  .label {
    font-size: 0.75rem;
    color: var(--text-light, #888);
    font-weight: bold;
    text-transform: uppercase;
  }

  input {
    background: var(--background, #1a1a1a);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    padding: 0.4rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .preview-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px dashed var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
  }

  .preview-box img {
    max-width: 120px;
    max-height: 120px;
    object-fit: contain;
  }

  .preview-error {
    color: #e57373;
    font-size: 0.8rem;
  }
</style>
