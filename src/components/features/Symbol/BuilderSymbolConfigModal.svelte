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

  /** Upload types the map can draw: the symbol library is SVG, and WebP keeps photos small. */
  const CUSTOM_SYMBOL_TYPES = ['image/svg+xml', 'image/webp'];

  const tabs = [
    { id: 'basics', label: 'Basics', content: basicsTab },
    { id: 'advanced', label: 'Advanced', content: advancedTab }
  ];
  let activeTab = $state('basics');

  /**
   * The picked built-in symbol, or null while a custom image is in use. A marker is one or the
   * other, so choosing one clears the other (see `selectSymbol` and `setCustomImage`).
   */
  let symbolName = $state<PickerProps['name']>(
    untrack(() =>
      config.image && !config.symbol ? null : ((config.symbol?.name as PickerProps['name']) ?? 'circle')
    )
  );
  let symbolVariant = $state<NonNullable<PickerProps['variant']>>(untrack(() => config.symbol?.variant ?? 'fill'));
  let symbolColour = $state<string>(untrack(() => config.symbol?.colour ?? 'blue'));
  let symbolScheme = $state<NonNullable<PickerProps['scheme']>>(untrack(() => config.symbol?.scheme ?? 'light'));
  let symbolSize = $state<number>(untrack(() => config.symbol?.size ?? 18));

  let symbolImage = $state<SymbolLayer['image']>(untrack(() => $state.snapshot(config.image)));
  let lng = $state<number>(untrack(() => config.coords?.[0] ?? 0));
  let lat = $state<number>(untrack(() => config.coords?.[1] ?? 0));
  let animationClock = $state(untrack(() => config.animationClock));
  let id = $state(untrack(() => config.id));

  /** Picking a built-in symbol drops any custom image. */
  function selectSymbol(name: PickerProps['name']) {
    symbolName = name;
    if (name) symbolImage = undefined;
  }

  /** Choosing a custom image deselects the built-in symbol. Removing it brings back the default. */
  function setCustomImage(image: SymbolLayer['image']) {
    symbolImage = image;
    if (image) symbolName = null;
    else if (!symbolName) symbolName = 'circle';
  }

  function handleSave() {
    // A custom image wins; otherwise the picked symbol. The layer never keeps both.
    if (symbolImage) {
      config.image = $state.snapshot(symbolImage);
      config.symbol = undefined;
    } else {
      config.symbol = {
        name: symbolName ?? 'circle',
        variant: symbolVariant,
        colour: symbolColour,
        scheme: symbolScheme,
        size: symbolSize
      };
      config.image = undefined;
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
    <Tabs items={tabs} bind:activeId={activeTab} />
  </div>

  {#snippet footerChildren()}
    <button type="button" onclick={handleSave}>Save</button>
    <button type="button" onclick={handleCancel}>Cancel</button>
  {/snippet}
</Modal>

{#snippet basicsTab()}
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
{/snippet}

{#snippet advancedTab()}
  <div class="advanced-tab">
    <!-- Light symbols suit a dark map and dark symbols a light one, so the scheme is saved with the symbol (see lib/symbolImage.ts) -->
    <div class="picker-column">
      <SymbolPicker
        bind:name={() => symbolName, selectSymbol}
        bind:variant={symbolVariant}
        bind:colour={symbolColour}
        bind:scheme={symbolScheme}
        bind:size={symbolSize}
        showSchemeToggle
      />
    </div>

    <fieldset class="upload-column">
      <legend>Upload custom symbol</legend>
      <ImageUpload
        bind:value={() => symbolImage, setCustomImage}
        accept={CUSTOM_SYMBOL_TYPES}
        prompt="Drag and drop an SVG or WebP image, or choose a file. It is shown at half its pixel size (@2x), and the size setting doesn't apply to it:"
      />
    </fieldset>
  </div>
{/snippet}

<style>
  /* A fixed minimum size, so the modal doesn't resize when switching between tabs. It is capped to the viewport on small screens. */
  .symbol-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: min(800px, 85vw);
    min-height: min(600px, 70vh);
  }

  /* `Modal` caps its body at 50vh, which would cut the minimum height short and scroll the content. */
  :global(.modal-content:has(> .symbol-modal)) {
    max-height: 85vh;
  }

  /* The Symbol and Animation Clock fieldsets share a line, wrapping when the modal is too narrow. */
  .top-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1rem;
    align-items: start;
  }

  /* The picker and the upload sit side by side when there is room, and stack when there isn't. */
  .advanced-tab {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: start;
  }

  .picker-column {
    /* Takes all the room the upload doesn't, and stacks above it when it can't keep 22rem. */
    flex: 1 1 22rem;
    min-width: 0;
  }

  .upload-column {
    /* A fixed-width side column: it doesn't grow, and wraps below the picker on small screens. */
    flex: 0 1 14rem;
    min-width: 0;
    margin: 0;
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
