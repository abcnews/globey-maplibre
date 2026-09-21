<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type * as maplibregl from 'maplibre-gl';
  import type { LabelItem } from '../../../lib/data/jsonBlob.ts';
  import { GeoAlt } from 'svelte-bootstrap-icons';
  import { safeFlyTo } from '../../Builder/utils';

  interface Props {
    /** The array of Custom Labels being configured */
    config: LabelItem[];
    /** MapLibre map instance for zooming */
    map?: maplibregl.Map;
    /** Callback fired when closing the modal */
    onclose?: (bounds?: [number, number][]) => void;
  }

  let { config = $bindable([]), map, onclose }: Props = $props();

  function autoFocusLast(node: HTMLInputElement, isLast: boolean) {
    if (isLast) {
      setTimeout(() => {
        node.focus();
        node.select();
      }, 50);
    }
  }

  function updateLabel(index: number, key: keyof LabelItem, value: any) {
    const updated = [...(config || [])];
    updated[index] = { ...updated[index], [key]: value };
    config = updated;
  }

  function removeLabel(index: number) {
    config = (config || []).filter((_, i) => i !== index);
  }

  function zoomToLabel(label: LabelItem) {
    if (!map) return;
    safeFlyTo(map, {
      center: label.coords,
      padding: 50
    });
  }
</script>

<Modal title="Custom Labels" onClose={() => onclose?.()} position="right">
  <div class="custom-labels-modal">
    <div class="label-list">
      {#if !config || config.length === 0}
        <div class="empty-state">
          No custom labels placed yet. Use the + button on the Custom Labels layer to place labels on the map.
        </div>
      {:else}
        {#each config as label, i (label.coords ? `${label.coords[0]}_${label.coords[1]}_${i}` : i)}
          <div class="label-item">
            <input
              type="text"
              value={label.name}
              use:autoFocusLast={i === config.length - 1}
              oninput={e => updateLabel(i, 'name', e.currentTarget.value)}
              placeholder="LabelItem text"
            />
            <select
              value={label.style}
              onchange={e => updateLabel(i, 'style', e.currentTarget.value)}
              style="max-width:8.5em"
            >
              <option value="country-large">Country</option>
              <option value="country-small">Country (small)</option>
              <option value="water-large">Waterway</option>
              <option value="water-small">Waterway (small)</option>
            </select>
            <button
              type="button"
              class="btn-icon"
              onclick={() => zoomToLabel(label)}
              aria-label="Zoom to label"
              title="Zoom to label"
            >
              <GeoAlt />
            </button>
            <button
              type="button"
              class="btn-icon"
              onclick={() => removeLabel(i)}
              aria-label="Remove label"
              title="Remove label"
            >
              ×
            </button>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  {#snippet footerChildren()}
    <button type="button" onclick={() => onclose?.()}>OK</button>
  {/snippet}
</Modal>

<style>
  .custom-labels-modal {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 360px;
  }

  .label-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 420px;
    overflow-y: auto;
  }

  .label-item {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 0.5rem;
    align-items: center;
    background: var(--background-alt, #2c2c2f);
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
  }

  .empty-state {
    color: var(--text-light, #888);
    font-style: italic;
    font-size: 0.85rem;
    padding: 0.5rem 0;
  }

  input {
    width: 100%;
    min-width: 0;
  }
</style>
