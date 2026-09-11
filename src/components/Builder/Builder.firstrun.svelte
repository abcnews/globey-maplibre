<script lang="ts">
  import { jsonBlob, hasStoredSession, loadStoredJsonBlob } from '../../lib/data/blobStore.ts';
  import { safeParseGlobeJsonBlob } from '../../lib/data/jsonBlob.ts';
  import { fetchDownloadObject } from '../../lib/fetchDownloadObject.ts';
  import { parseCmid, isValidCmid } from '../Builder.legacy/CmidInput/utils.ts';
  import { Modal, Loader } from '@abcnews/components-builder';

  interface Props {
    /** Callback fired when a project JSON blob has been chosen / loaded */
    onsuccess?: () => void;
  }

  let { onsuccess }: Props = $props();

  const canRestore = $derived(hasStoredSession());
  const storedDraft = $derived(loadStoredJsonBlob());

  // Modal states for CMID and JSON paste
  let isCmidModalOpen = $state(false);
  let isJsonModalOpen = $state(false);

  // CMID form state
  let cmidInput = $state('');
  let isCmidLoading = $state(false);
  let cmidError = $state<string | null>(null);

  // JSON paste form state
  let pastedJson = $state('');
  let jsonError = $state<string | null>(null);

  function handleRestore() {
    if (jsonBlob.restoreSession()) {
      onsuccess?.();
    }
  }

  function handleNewSession() {
    jsonBlob.initNew();
    onsuccess?.();
  }

  async function handleLoadCmid() {
    const id = parseCmid(cmidInput);
    if (!id) {
      cmidError = 'Please enter a valid numeric CoreMedia ID.';
      return;
    }

    isCmidLoading = true;
    cmidError = null;

    try {
      const data = await fetchDownloadObject(id);
      const res = safeParseGlobeJsonBlob(data);
      if (!res.success) {
        throw new Error(`Data is not a valid Globy JSON schema: ${res.error.message}`);
      }
      jsonBlob.loadJson(res.data);
      isCmidModalOpen = false;
      onsuccess?.();
    } catch (err: any) {
      cmidError = err?.message || 'Failed to load document from CoreMedia.';
    } finally {
      isCmidLoading = false;
    }
  }

  function handleLoadJson() {
    jsonError = null;
    const trimmed = pastedJson.trim();
    if (!trimmed) {
      jsonError = 'Please paste JSON content first.';
      return;
    }

    const res = safeParseGlobeJsonBlob(trimmed);
    if (!res.success) {
      jsonError = `Invalid JSON schema: ${res.error.message}`;
      return;
    }

    jsonBlob.loadJson(res.data);
    isJsonModalOpen = false;
    onsuccess?.();
  }
</script>

<div class="firstrun-wrapper">
  <fieldset class="builder__spacious">
    <legend>Globy Builder</legend>
    <p class="description">Select how you would like to start this scrollyteller session:</p>

    <div class="firstrun-actions">
      {#if canRestore}
        <button type="button" class="firstrun-action-btn" onclick={handleRestore}>
          <strong>Restore previous session</strong>
          <span class="btn-subtext">
            {storedDraft?.title ? `“${storedDraft.title}”` : 'Draft'} ({storedDraft?.layers?.length ?? 0} layers)
          </span>
        </button>
      {/if}

      <button type="button" class="firstrun-action-btn" onclick={handleNewSession}>
        <strong>Create new session</strong>
        <span class="btn-subtext">Start fresh with a blank canvas and default map settings</span>
      </button>

      <button
        type="button"
        class="firstrun-action-btn"
        onclick={() => {
          cmidError = null;
          isCmidModalOpen = true;
        }}
      >
        <strong>Load from CMID</strong>
        <span class="btn-subtext">Import existing globe configuration from a CoreMedia document</span>
      </button>

      <button
        type="button"
        class="firstrun-action-btn"
        onclick={() => {
          jsonError = null;
          isJsonModalOpen = true;
        }}
      >
        <strong>Load from JSON</strong>
        <span class="btn-subtext">Paste a raw GlobeJsonBlob or scrollyteller presentation JSON</span>
      </button>
    </div>
  </fieldset>
</div>

{#if isCmidModalOpen}
  <Modal title="Load from CoreMedia (CMID)" onClose={() => (isCmidModalOpen = false)}>
    <div class="firstrun-modal-body">
      <fieldset>
        <legend>CoreMedia ID</legend>
        <input
          id="firstrun-cmid-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="e.g. 106753230"
          bind:value={cmidInput}
          onkeydown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleLoadCmid();
            }
          }}
          disabled={isCmidLoading}
        />
      </fieldset>

      {#if cmidError}
        <p class="error-text">{cmidError}</p>
      {/if}
    </div>

    {#snippet footerChildren()}
      <button
        type="button"
        onclick={handleLoadCmid}
        disabled={isCmidLoading || !isValidCmid(cmidInput)}
      >
        {#if isCmidLoading}
          <Loader /> Loading...
        {:else}
          Load
        {/if}
      </button>
      <button type="button" onclick={() => (isCmidModalOpen = false)} disabled={isCmidLoading}>
        Cancel
      </button>
    {/snippet}
  </Modal>
{/if}

{#if isJsonModalOpen}
  <Modal title="Load from JSON" onClose={() => (isJsonModalOpen = false)}>
    <div class="firstrun-modal-body">
      <fieldset>
        <legend>JSON Blob</legend>
        <textarea
          id="firstrun-json-textarea"
          placeholder="Paste valid GlobeJsonBlob here..."
          bind:value={pastedJson}
          rows="14"
          spellcheck="false"
        ></textarea>
      </fieldset>

      {#if jsonError}
        <p class="error-text">{jsonError}</p>
      {/if}
    </div>

    {#snippet footerChildren()}
      <button type="button" onclick={handleLoadJson} disabled={!pastedJson.trim()}>
        Import JSON
      </button>
      <button type="button" onclick={() => (isJsonModalOpen = false)}>
        Cancel
      </button>
    {/snippet}
  </Modal>
{/if}

<style>
  .firstrun-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
    box-sizing: border-box;
  }

  .firstrun-wrapper fieldset {
    max-width: 32rem;
    width: 100%;
    margin: 0;
  }

  .description {
    margin: 0 0 0.5rem 0;
    color: var(--text-light);
    font-size: 0.9rem;
  }

  .firstrun-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .firstrun-action-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    padding: 0.6rem 0.75rem;
    text-align: left;
    width: 100%;
  }

  .btn-subtext {
    font-size: 0.8rem;
    color: var(--text-light);
    font-weight: normal;
  }

  .firstrun-modal-body {
    width: 90vw;
    max-width: 36rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .firstrun-modal-body fieldset {
    margin-bottom: 0.5rem;
  }

  .error-text {
    margin: 0;
    color: #e03131;
    font-size: 0.85rem;
  }
</style>
