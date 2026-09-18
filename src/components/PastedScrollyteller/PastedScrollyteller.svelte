<script lang="ts">
  import { BuilderStyleRoot } from '@abcnews/components-builder';
  import { stringify } from '@abcnews/alternating-case-to-object';
  import { onMount } from 'svelte';
  import PastedScrollytellerGlobe from './PastedScrollytellerGlobe.svelte';
  import { parsePastedContent } from './parsePastedContent';
  import type { ScrollytellerDefinition } from '@abcnews/svelte-scrollyteller';
  import type { DecodedObject } from '../../lib/marker';

  interface Props {
    /** Optional callback when returning to builder mode */
    onBackToBuilder?: () => void;
  }

  let { onBackToBuilder }: Props = $props();

  const STORAGE_KEY = 'GLOBEY_PASTED_SCROLLYTELLER_CONTENT';

  let pastedContent = $state('');
  let scrollytellerDefinition = $state<ScrollytellerDefinition | null>(null);
  let error = $state('');
  /** The panel currently active in PastedScrollytellerGlobe, plus the raw ACTO-parsed
   *  object openInBuilder() needs to re-encode it as a hash. */
  let activePanelData = $state<(DecodedObject & { originalData?: unknown }) | null>(null);
  // Bumped on every successful parse so the {#key} below always forces a full
  // destroy/recreate of PastedScrollytellerGlobe, even if the same text is pasted twice
  // in a row — its internal state (currentPanel, the MapLibre instance, etc.) must never
  // carry over between two different pasted docs.
  let pasteId = $state(0);

  function loadFromText(text: string) {
    if (!text.trim()) {
      error = 'Please enter or paste your scrollyteller content.';
      return;
    }
    try {
      error = '';
      const definition = parsePastedContent({ text, name: 'globey' });
      scrollytellerDefinition = definition;
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

  function openInBuilder() {
    const rawData = activePanelData?.originalData || activePanelData || {};
    const hash = stringify(rawData);
    const url = new URL(window.location.href);
    url.searchParams.delete('tool');
    url.searchParams.delete('mode');
    url.searchParams.delete('pasted');
    url.hash = hash;

    if (onBackToBuilder) {
      window.history.pushState({}, '', url.toString());
      window.location.hash = hash;
      onBackToBuilder();
    } else {
      window.location.href = url.toString();
    }
  }

  onMount(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      pastedContent = saved;
      loadFromText(saved);
    }
  });
</script>

<svelte:head>
  <title>Pasted Scrollyteller</title>
  <link
    rel="icon"
    type="image/png"
    href={`data:image/svg+xml,${`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-richtext" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/><path d="M4.5 12.5A.5.5 0 0 1 5 12h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m0-2A.5.5 0 0 1 5 10h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m1.639-3.708 1.33.886 1.854-1.855a.25.25 0 0 1 .289-.047l1.888.974V8.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V8s1.54-1.274 1.639-1.208M6.25 6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5"/></svg>`.replace(/\n/, ' ')}`}
  />
</svelte:head>

<BuilderStyleRoot>
  {#if scrollytellerDefinition}
    <div style:min-height="10000vh" class="scrolly-root">
      {#key pasteId}
        <PastedScrollytellerGlobe
          panels={scrollytellerDefinition.panels}
          onMarker={data => {
            activePanelData = data;
          }}
        />
      {/key}
      <div class="floaty">
        <button
          type="button"
          onclick={() => {
            scrollytellerDefinition = null;
          }}>Paste another doc</button
        >
        <button type="button" onclick={openInBuilder}>Open in builder</button>
      </div>
    </div>
  {:else}
    <form onsubmit={handleFormSubmit}>
      <fieldset class="builder__spacious">
        <legend>Pasted Scrollyteller</legend>
        <p>
          Paste the contents of your story or article below to preview the scrollyteller in real time.
        </p>
        <p>
          <small>
            Ensure your text includes an opener marker (e.g. <code>#scrollytellerNAMEglobey1</code>), one or more
            <code>#mark</code> tags, and an <code>#endscrollyteller</code> tag.
          </small>
        </p>

        {#if error}
          <div class="error" role="alert">
            {error}
          </div>
        {/if}

        <label>
          <strong>Scrollyteller Content:</strong>
          <textarea
            name="pastedContent"
            rows="14"
            bind:value={pastedContent}
            placeholder="#scrollytellerNAMEglobey1

Introductory story text...

#mark...

Second panel text...

#endscrollyteller"
          ></textarea>
        </label>

        <div class="builder__submit-row">
          <button type="submit">Preview scrollyteller</button>
        </div>
      </fieldset>
    </form>
  {/if}
</BuilderStyleRoot>

<style>
  :global(body) {
    font-family: ABCSans, sans-serif;
    margin: 0;
  }

  form {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 44rem;
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
