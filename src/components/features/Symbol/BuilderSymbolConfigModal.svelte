<script lang="ts">
  import { SymbolPicker } from '@abcnews/components-dataviz';
  import { untrack, type ComponentProps } from 'svelte';
  import { jsonBlob } from '../../../lib/data/blobStore.ts';
  import type { SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import ImageUpload from '../../shared/ImageUpload/ImageUpload.svelte';
  import TabbedModal, { type ModalTab } from '../../shared/TabbedModal/TabbedModal.svelte';
  import AnimationClockField from '../utils/AnimationClockField.svelte';
  import LayerIdField from '../utils/LayerIdField.svelte';
  import { uniqueLayerId } from '../utils/layerOps.ts';

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

  const tabs: ModalTab[] = [
    { id: 'symbol', label: 'Symbol', content: basicsTab },
    { id: 'advanced', label: 'Advanced', content: advancedTab }
  ];
  let activeTab = $state('symbol');

  /**
   * The picked built-in symbol, or null while a custom image is in use. A marker is one or the
   * other, so choosing one clears the other (see `selectSymbol` and `setCustomImage`).
   */
  let symbolName = $state<PickerProps['name']>(
    untrack(() => (config.image && !config.symbol ? null : ((config.symbol?.name as PickerProps['name']) ?? 'circle')))
  );
  let symbolVariant = $state<NonNullable<PickerProps['variant']>>(untrack(() => config.symbol?.variant ?? 'fill'));
  let symbolColour = $state<string>(untrack(() => config.symbol?.colour ?? 'blue'));
  let symbolScheme = $state<NonNullable<PickerProps['scheme']>>(untrack(() => config.symbol?.scheme ?? 'light'));
  let symbolSize = $state<number>(untrack(() => config.symbol?.size ?? 18));

  let symbolImage = $state<SymbolLayer['image']>(untrack(() => $state.snapshot(config.image)));
  let lng = $state<number>(untrack(() => config.coords?.[0] ?? 0));
  let lat = $state<number>(untrack(() => config.coords?.[1] ?? 0));
  let annotation = $state(untrack(() => config.annotation ?? ''));
  let animationClock = $state(untrack(() => config.animationClock));
  let id = $state(untrack(() => config.id));

  /** The id this layer had when the modal opened, which doesn't count as taken by another layer. */
  const originalId = untrack(() => config.id);

  /**
   * Whether the id still follows the annotation text. True for a freshly generated id
   * (`symbol` + 5 random characters), and false once the author types their own.
   */
  let isIdAutomatic = $state(untrack(() => /^symbol[a-z0-9]{5}$/.test(config.id ?? '')));

  /** Typing in the id field takes it off automatic. */
  function setCustomId(value: string | undefined) {
    id = value;
    isIdAutomatic = false;
  }

  /** Keeps the id unique and in step with the annotation, until the author sets their own. */
  function handleAnnotationInput() {
    if (!isIdAutomatic || !annotation.trim()) return;
    const otherIds = ($jsonBlob?.layers ?? []).map(layer => layer.id).filter(layerId => layerId !== originalId);
    id = uniqueLayerId(annotation, 'symbol', otherIds);
  }

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
    // Kept exactly as typed (newlines and all); blank means no annotation.
    config.annotation = annotation.trim() ? annotation : undefined;
    config.animationClock = animationClock;
    config.id = id;
    onclose?.();
  }

  function handleCancel() {
    onclose?.();
  }
</script>

<!-- A fixed minimum size, so the modal doesn't resize between tabs. It is capped to the viewport on small screens. -->
<TabbedModal
  {tabs}
  bind:activeId={activeTab}
  onClose={handleCancel}
  minWidth="min(800px, 85vw)"
  minHeight="min(600px, 70vh)"
  {footer}
/>

{#snippet footer()}
  <button type="button" onclick={handleSave}>Save</button>
  <button type="button" onclick={handleCancel}>Cancel</button>
{/snippet}

{#snippet basicsTab()}
  <div class="top-row">
    <fieldset>
      <legend>Symbol</legend>
      <div class="fields">
        <div class="name-field">
          <LayerIdField bind:id={() => id, setCustomId} label="Name" showHelp={false} />
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
      <label class="annotation-field">
        <span>Annotation</span>
        <textarea rows="3" bind:value={annotation} oninput={handleAnnotationInput} placeholder="Text shown beside the symbol"
        ></textarea>
      </label>
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
        prompt="Drag and drop an SVG or WebP image, or choose a file. It is shown at half its pixel size (@2x):"
      />
    </fieldset>
  </div>
{/snippet}

<style>
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

  .annotation-field {
    display: block;
    margin-top: 0.75rem;
  }

  .annotation-field span {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .annotation-field textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
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

  input,
  textarea {
    background: var(--background, #1a1a1a);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    padding: 0.4rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
</style>
