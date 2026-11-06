<script lang="ts">
  import { Modal, Tabs } from '@abcnews/components-builder';
  import { SymbolPicker } from '@abcnews/components-dataviz';
  import { untrack, type ComponentProps } from 'svelte';
  import type { SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import ImageUpload from '../../shared/ImageUpload/ImageUpload.svelte';
  import AnimationClockField from '../utils/AnimationClockField.svelte';
  import LayerIdField from '../utils/LayerIdField.svelte';

  type PickerProps = ComponentProps<typeof SymbolPicker>;

  interface Props {
    /** The SymbolLayer object being edited or drafted */
    config: Partial<SymbolLayer>;
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  /** Which tab is open: 'symbol' or 'image'. A layer that only has an uploaded image opens on its image. */
  let source = $state<string>(untrack(() => (config.image && !config.symbol ? 'image' : 'symbol')));

  const tabs = [
    { id: 'symbol', label: 'Symbol', content: symbolTab },
    { id: 'image', label: 'Image', content: imageTab }
  ];

  let symbolName = $state<NonNullable<PickerProps['name']>>(
    untrack(() => (config.symbol?.name as NonNullable<PickerProps['name']>) ?? 'circle')
  );
  let symbolVariant = $state<NonNullable<PickerProps['variant']>>(untrack(() => config.symbol?.variant ?? 'fill'));
  let symbolColour = $state<string>(untrack(() => config.symbol?.colour ?? 'blue'));
  let symbolScheme = $state<NonNullable<PickerProps['scheme']>>(untrack(() => config.symbol?.scheme ?? 'light'));

  let symbolImage = $state<SymbolLayer['image']>(untrack(() => $state.snapshot(config.image)));
  let lng = $state<number>(untrack(() => config.coords?.[0] ?? 0));
  let lat = $state<number>(untrack(() => config.coords?.[1] ?? 0));
  let animationClock = $state(untrack(() => config.animationClock));
  let id = $state(untrack(() => config.id));

  function handleSave() {
    // Only the open tab's source is kept, so a layer never has both.
    if (source === 'symbol') {
      config.symbol = { name: symbolName, variant: symbolVariant, colour: symbolColour, scheme: symbolScheme };
      config.image = undefined;
    } else {
      config.image = $state.snapshot(symbolImage);
      config.symbol = undefined;
    }
    config.coords = [lng, lat];
    config.animationClock = animationClock;
    config.id = id;
    onclose?.();
  }

  function handleCancel() {
    onclose?.();
  }
</script>

<Modal title="Symbol Configuration" onClose={handleCancel}>
  <div class="symbol-modal">
    <div class="top-row">
      <fieldset>
        <legend>Symbol</legend>
        <div class="fields">
          <div class="name-field">
            <LayerIdField bind:id label="Name" showHelp={false} />
          </div>
          <label class="coord-field">
            <span>Longitude</span>
            <input type="number" step="0.0001" bind:value={lng} />
          </label>
          <label class="coord-field">
            <span>Latitude</span>
            <input type="number" step="0.0001" bind:value={lat} />
          </label>
        </div>
      </fieldset>
      <AnimationClockField bind:animationClock />
    </div>

    <!-- The tabs only choose what the marker looks like; everything above applies to both. -->
    <Tabs items={tabs} bind:activeId={source} />
  </div>

  {#snippet footerChildren()}
    <button type="button" onclick={handleSave}>Save</button>
    <button type="button" onclick={handleCancel}>Cancel</button>
  {/snippet}
</Modal>

{#snippet symbolTab()}
  <!-- Light symbols suit a dark map and dark symbols a light one, so the scheme is saved with the symbol (see lib/symbolImage.ts) -->
  <SymbolPicker
    bind:name={symbolName}
    bind:variant={symbolVariant}
    bind:colour={symbolColour}
    bind:scheme={symbolScheme}
    showSchemeToggle
  />
{/snippet}

{#snippet imageTab()}
  <ImageUpload bind:value={symbolImage} label="Marker image" />
{/snippet}

<style>
  .symbol-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* The Symbol and Animation Clock fieldsets share a line, wrapping when the modal is too narrow. */
  .top-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1rem;
    align-items: start;
  }

  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: start;
  }

  .name-field {
    width: 10em;
  }

  .coord-field {
    width: 7em;
    margin-bottom: 0;
  }

  .coord-field input {
    width: 100%;
  }

  /* Matches LayerIdField's label, which sits in the same row */
  .coord-field span {
    font-size: 0.85rem;
    font-weight: 500;
  }

  input {
    background: var(--background, #1a1a1a);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    padding: 0.4rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

</style>
