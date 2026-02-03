<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { ArrowUp, ArrowDown } from 'svelte-bootstrap-icons';

  /**
   * PropList
   * A reusable list component for builder properties with truncated labels,
   * descriptions, and action buttons. Supports reordering via D&D and keyboard.
   */

  let {
    items,
    name,
    description,
    actions,
    onchange
  }: {
    items: T[];
    name: Snippet<[T, number]>;
    description?: Snippet<[T, number]>;
    actions: Snippet<[T, number]>;
    onchange?: (items: T[]) => void;
  } = $props();

  let draggingIndex = $state<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const newItems = [...items];
    const [item] = newItems.splice(from, 1);
    newItems.splice(to, 0, item);
    onchange?.(newItems);
  }

  function onDragStart(i: number) {
    draggingIndex = i;
  }

  function onDragOver(e: DragEvent, i: number) {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === i) return;
    move(draggingIndex, i);
    draggingIndex = i;
  }

  function onDragEnd() {
    draggingIndex = null;
  }
</script>

<ul class="prop-list">
  {#each items as item, i (item)}
    <li
      draggable="true"
      class:dragging={draggingIndex === i}
      ondragstart={() => onDragStart(i)}
      ondragover={e => onDragOver(e, i)}
      ondragend={onDragEnd}
    >
      <div class="reorder-btns">
        <button class="btn-icon" aria-label="Move Up" disabled={i === 0} onclick={() => move(i, i - 1)}>
          <ArrowUp />
        </button>
        <button
          class="btn-icon"
          aria-label="Move Down"
          disabled={i === items.length - 1}
          onclick={() => move(i, i + 1)}
        >
          <ArrowDown />
        </button>
      </div>
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
      <div class="actions-wrapper">
        <div class="actions">
          {@render actions(item, i)}
        </div>
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
    overflow: hidden;
  }
  .prop-list li {
    position: relative;
    padding: 0.5rem;
    padding-left: 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    background: var(--background-alt);
    color: var(--text);
    cursor: grab;
  }
  .prop-list li:last-child {
    border-bottom: none;
  }

  .prop-list li.dragging {
    opacity: 0.5;
    cursor: grabbing;
    z-index: 10;
  }

  .info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
    pointer-events: none; /* Let drag pass through to li */
  }
  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .description {
    font-size: 0.8em;
    opacity: 0.7;
  }

  .actions-wrapper {
    cursor: initial;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .actions {
    display: flex;
    gap: 0.2rem;
    flex-shrink: 0;
  }

  .reorder-btns {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s;
    background: rgba(0, 0, 0, 0.05);
    cursor: initial;
  }

  .reorder-btns button {
    height: 50%;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .prop-list li:focus-within .reorder-btns {
    opacity: 1;
  }
</style>
