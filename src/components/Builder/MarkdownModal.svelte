<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import { marked } from 'marked';

  let {
    title = 'Help',
    markdown = '',
    onclose
  } = $props<{
    title?: string;
    markdown: string;
    onclose: () => void;
  }>();

  let html = $derived(marked.parse(markdown));
</script>

{#snippet footerChildren()}
  <button onclick={onclose}>Close</button>
{/snippet}

<Modal onClose={onclose} {title} {footerChildren}>
  <div class="help-content">
    {@html html}
  </div>
</Modal>

<style>
  .help-content {
    width: 90vw;
    max-width: 50em;
    line-height: 1.5;
  }
</style>
