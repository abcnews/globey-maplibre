<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  /**
   * PropList
   * A reusable list component for builder properties with truncated labels,
   * descriptions, and action buttons.
   */

  let {
    items,
    name,
    description,
    actions
  }: {
    items: T[];
    name: Snippet<[T, number]>;
    description?: Snippet<[T, number]>;
    actions: Snippet<[T, number]>;
  } = $props();
</script>

<ul class="prop-list">
  {#each items as item, i}
    <li>
      <div class="info">
        <div class="name">
          {@render name(item, i)}
        </div>
        {#if description}
          <div class="description">
            {@render description(item, i)}
          </div>
        {/if}
      </div>
      <div class="actions">
        {@render actions(item, i)}
      </div>
    </li>
  {/each}
</ul>

<style>
  .prop-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem 0;
    border: 1px solid var(--border);
    border-radius: 0.2rem;
  }
  .prop-list li {
    padding: 0.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .prop-list li:last-child {
    border-bottom: none;
  }
  .info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
  }
  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .description {
    font-size: 0.8em;
    color: #666;
  }
  .actions {
    display: flex;
    gap: 0.2rem;
    flex-shrink: 0;
  }
</style>
