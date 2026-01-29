<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { DecodedObject } from '../../lib/marker';

  let { options = $bindable() } = $props<{ options: DecodedObject }>();
  let isOpen = $state(false);
  let editValue = $state('');

  function open() {
    editValue = JSON.stringify(options, null, 2);
    isOpen = true;
  }

  function apply() {
    try {
      options = JSON.parse(editValue);
      isOpen = false;
    } catch (e: any) {
      alert('Invalid JSON: ' + e.message);
    }
  }
</script>

<button onclick={open}>Inspect marker JSON</button>

{#if isOpen}
  <Modal onClose={() => (isOpen = false)} title="Marker JSON">
    <div class="debug-modal-content">
      <textarea bind:value={editValue} spellcheck="false"></textarea>
    </div>
    {#snippet footerChildren()}
      <button onclick={apply}>Apply</button>
      <button onclick={() => (isOpen = false)}>Cancel</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .debug-modal-content {
    width: 90vw;
    max-width: 50em;
  }
  textarea {
    width: 100%;
    height: 40vh;
  }
</style>
