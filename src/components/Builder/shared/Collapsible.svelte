<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronRight } from 'svelte-bootstrap-icons';

  let {
    open = $bindable(false),
    header,
    actions,
    children
  }: {
    open?: boolean;
    header: Snippet;
    actions?: Snippet;
    children: Snippet;
  } = $props();
</script>

<details bind:open class="collapsible-root">
  <summary class="collapsible-summary">
    <div class="header-container" role="presentation">
      <div class="chevron-wrapper" class:open>
        <ChevronRight size="14" />
      </div>
      {@render header()}
    </div>
    {#if actions}
      <div
        class="actions-container"
        role="presentation"
        onclick={(e) => e.stopPropagation()}
      >
        {@render actions()}
      </div>
    {/if}
  </summary>

  <div class="collapsible-body">
    {@render children()}
  </div>
</details>

<style>
  .collapsible-root {
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .collapsible-summary {
    padding: 0.5rem 1rem;
    cursor: pointer;
    background-color: transparent;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }

  .collapsible-root[open] .collapsible-summary {
    border-bottom-color: var(--border, rgba(122, 123, 135, 0.5));
    background-color: var(--background-alt, #2c2c2f);
  }

  .collapsible-body {
    padding: 1rem;
  }

  .header-container {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .chevron-wrapper {
    display: flex;
    align-items: center;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.4;
  }

  .chevron-wrapper.open {
    transform: rotate(90deg);
    opacity: 0.8;
  }

  .actions-container {
    display: flex;
    gap: 0.5rem;
  }
</style>
