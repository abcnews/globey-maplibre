<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import { parsePastedContent } from '../PastedScrollyteller/parsePastedContent.ts';
  import ScrollytellerGlobe from '../ScrollytellerGlobe/ScrollytellerGlobe.svelte';
  import { MARKER_NAME } from '../../lib/constants.ts';
  import { onMount } from 'svelte';
  import type { ScrollytellerDefinition } from '@abcnews/svelte-scrollyteller';

  const STORAGE_KEY = 'GLOBEY_PASTED_SCROLLYTELLER_CONTENT';

  let pastedContent = $state('');
  let scrollytellerDefinition = $state<ScrollytellerDefinition | null>(null);
  let error = $state('');
  // Bumped on every successful parse so the {#key} below always forces a full
  // destroy/recreate of ScrollytellerGlobe, even if the same text is pasted twice in a
  // row — the mode component's own internal state (currentPanel, the MapLibre instance,
  // TweenController, etc.) must never carry over between two different pasted docs.
  let pasteId = $state(0);

  function loadFromText(text: string) {
    if (!text.trim()) {
      error = 'Please enter or paste your scrollyteller content.';
      return;
    }
    try {
      error = '';
      scrollytellerDefinition = parsePastedContent({ text, name: MARKER_NAME });
      pasteId += 1;
      sessionStorage.setItem(STORAGE_KEY, text);
    } catch (e: any) {
      error = e.message || 'Unable to parse pasted content.';
      scrollytellerDefinition = null;
    }
  }

  function handleFormSubmit(event: SubmitEvent) {
    event.preventDefault();
    loadFromText(pastedContent);
  }

  onMount(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      pastedContent = saved;
      loadFromText(saved);
    }
  });
</script>

{#if !$jsonBlob}
  <div class="notice">
    <p>No JSON blob is loaded yet — load or create one in Layers Mode first.</p>
  </div>
{:else if scrollytellerDefinition}
  <div style:min-height="10000vh" class="scrolly-root">
    {#key pasteId}
      <ScrollytellerGlobe jsonBlob={$jsonBlob} panels={scrollytellerDefinition.panels} />
    {/key}
    <div class="floaty">
      <button type="button" onclick={() => (scrollytellerDefinition = null)}>Paste another doc</button>
    </div>
  </div>
{:else}
  <form onsubmit={handleFormSubmit}>
    <fieldset class="builder__spacious">
      <legend>Pasted Scrollyteller (test harness)</legend>
      <p>
        Paste the marker text of a scrollyteller below to preview it against the currently loaded JSON blob
        (<strong>{$jsonBlob.title || 'untitled'}</strong>).
      </p>
      <p>
        <small>
          Ensure your text includes an opener marker (e.g. <code>#scrollytellerNAME{MARKER_NAME}1</code>), one or
          more <code>#mark...</code> tags, and an <code>#endscrollyteller</code> tag.
        </small>
      </p>

      {#if error}
        <div class="error" role="alert">{error}</div>
      {/if}

      <label>
        <strong>Scrollyteller Content:</strong>
        <textarea
          name="pastedContent"
          rows="14"
          bind:value={pastedContent}
          placeholder={`#scrollytellerNAME${MARKER_NAME}1\n\nIntroductory story text...\n\n#markBBOX...CAM1500msLAYERfireson\n\nSecond panel text...\n\n#endscrollyteller`}
        ></textarea>
      </label>

      <div class="builder__submit-row">
        <button type="submit">Preview scrollyteller</button>
      </div>
    </fieldset>
  </form>
{/if}

<style>
  form {
    max-width: 44rem;
    margin: 2rem auto;
    box-sizing: border-box;
  }

  fieldset {
    display: flex;
    gap: 0.75rem;
    flex-direction: column;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.4;
    padding: 0.6rem;
    border-radius: 4px;
    resize: vertical;
  }

  p {
    margin: 0;
  }

  code {
    font-family: monospace;
    background: rgba(128, 128, 128, 0.15);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
  }

  .error {
    border: 1px solid rgb(255, 153, 0);
    background: rgba(255, 128, 0, 0.08);
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    color: #e65100;
  }

  .notice {
    max-width: 30rem;
    margin: 2rem auto;
    text-align: center;
  }

  .floaty {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1000;
    display: flex;
    gap: 0.5rem;
  }

  .scrolly-root {
    background: white;
    color: black;
    border-radius: 0.2rem;
  }
</style>
