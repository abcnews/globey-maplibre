<script lang="ts">
  import { onMount } from 'svelte';
  import { Modal } from '@abcnews/components-builder';

  let isOpen = $state(false);
  let ratioMobile = $state('3:4');
  let ratioDesktop = $state('4:3');

  const getIframeUrl = () => {
    const url = new URL(window.location.href);
    const pathname = url.pathname.replace(/\/builder\/?$/, '/');
    const searchParams = new URLSearchParams();

    searchParams.set('abcnewsembedheight', '100');
    // Only add ratio params if they differ from defaults
    if (ratioMobile !== '3:4') searchParams.set('ratio-mobile', ratioMobile);
    if (ratioDesktop !== '4:3') searchParams.set('ratio-desktop', ratioDesktop);

    const search = searchParams.toString();
    return url.origin + pathname + (search ? `?${search}` : '') + url.hash;
  };

  let url = $state(getIframeUrl());
  let copied = $state(false);

  $effect(() => {
    // Regenerate URL when ratios change
    url = getIframeUrl();
  });

  onMount(() => {
    const handleHashChange = () => {
      url = getIframeUrl();
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    });
  };

  const previewIframe = () => {
    window.open(url, '_blank');
  };

  const ratios = ['3:4', '4:3', '1:1', '16:9', '9:16'];
</script>

<button onclick={() => (isOpen = true)}>Embed iframe...</button>

{#if isOpen}
  <Modal onClose={() => (isOpen = false)} title="Embed Iframe">
    <div class="embed-modal-content">
      <fieldset>
        <legend>URL</legend>
        <div class="input-group">
          <input id="iframe-url-input" type="text" readonly value={url} />
          <button onclick={copyToClipboard}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Aspect Ratios</legend>
        <div class="ratios-grid">
          <div class="field">
            <label for="ratio-mobile-select">Mobile</label>
            <select id="ratio-mobile-select" bind:value={ratioMobile}>
              {#each ratios as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <label for="ratio-desktop-select">Desktop</label>
            <select id="ratio-desktop-select" bind:value={ratioDesktop}>
              {#each ratios as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </div>
        </div>
      </fieldset>
    </div>

    {#snippet footerChildren()}
      <button onclick={previewIframe}>Preview iframe</button>
      <button onclick={() => (isOpen = false)}>Close</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .embed-modal-content {
    width: 90vw;
    max-width: 40em;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  fieldset {
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    min-width: 0;
    width: 100%;
  }

  .ratios-grid {
    display: flex;
    gap: 1rem;
  }

  .ratios-grid > * {
    flex: 1;
  }

  select {
    width: 100%;
  }

  button {
    white-space: nowrap;
  }
</style>
