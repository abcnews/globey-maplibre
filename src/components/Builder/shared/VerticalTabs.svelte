<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
  }

  let {
    tabs,
    activeTab = $bindable(),
    children
  }: {
    tabs: Tab[];
    activeTab: string;
    children: Snippet;
  } = $props();
</script>

<div class="tabs-root">
  <aside class="tabs-sidebar">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:selected={activeTab === tab.id}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </aside>

  <main class="tabs-content">
    {@render children()}
  </main>
</div>

<style>
  .tabs-root {
    display: flex;
    min-width: 800px;
    min-height: 500px;
  }

  .tabs-sidebar {
    width: 140px;
    border-right: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .tabs-content {
    flex: 1;
    padding: 1rem;
    max-height: 80vh;
    overflow-y: auto;
  }

  .tab-btn {
    text-align: left;
    padding: 0.75rem 1.25rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-light, #888);
    border-left: 3px solid transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    font-weight: 500;
  }

  .tab-btn:hover {
    color: var(--text, #ccc);
    background-color: rgba(255, 255, 255, 0.05);
  }

  .tab-btn:focus-visible {
    outline: 2px solid var(--builder-color-primary, #007bff);
    outline-offset: -2px;
  }

  .tab-btn.selected {
    color: var(--text, #ccc);
    background-color: rgba(255, 255, 255, 0.08);
    border-left-color: var(--builder-color-primary, #007bff);
    font-weight: 600;
  }
</style>
