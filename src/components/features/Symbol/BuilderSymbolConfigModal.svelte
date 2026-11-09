<script lang="ts">
  import { ColourPicker, colours, SymbolPicker } from '@abcnews/components-dataviz';
  import { untrack, type ComponentProps } from 'svelte';
  import { jsonBlob } from '../../../lib/data/blobStore.ts';
  import { ANNOTATION_ANCHORS, type SymbolLayer, type SymbolStyle } from '../../../lib/data/jsonBlob.ts';
  import ImageUpload from '../../shared/ImageUpload/ImageUpload.svelte';
  import TabbedModal, { type ModalTab } from '../../shared/TabbedModal/TabbedModal.svelte';
  import AnimationClockField from '../utils/AnimationClockField.svelte';
  import LayerIdField from '../utils/LayerIdField.svelte';
  import { uniqueLayerId } from '../utils/layerOps.ts';
  import { oppositeAnchor } from './annotationPlacement.ts';

  type PickerProps = ComponentProps<typeof SymbolPicker>;

  interface Props {
    /** The SymbolLayer object being edited or drafted */
    config: Partial<SymbolLayer>;
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  /** The palette colour a new symbol starts with, and what "Use default colour" goes back to. */
  const DEFAULT_COLOUR = 'blue';

  /** Upload types the map can draw: the symbol library is SVG, and WebP keeps photos small. */
  const CUSTOM_SYMBOL_TYPES = ['image/svg+xml', 'image/webp'];

  const tabs: ModalTab[] = [
    { id: 'symbol', label: 'Symbol', content: basicsTab },
    { id: 'advanced', label: 'Advanced', content: advancedTab }
  ];
  let activeTab = $state('symbol');

  /**
   * The symbol's own shape, as edited by the symbol picker. It is written to `config.symbol` unless a
   * custom image is in use (a marker is one or the other). Everything else binds straight to
   * `config`, which the Builder commits to the blob as it changes (`liveEdit`).
   */
  let symbolStyle = $state<SymbolStyle>(
    untrack(() => ({
      name: config.symbol?.name ?? 'circle',
      variant: config.symbol?.variant ?? 'fill',
      size: config.symbol?.size ?? 18
    }))
  );

  // Filled in once, so the fields below can bind to them directly.
  const annotationStyle = untrack(() => {
    config.annotationStyle = {
      anchor: 'bottom-left',
      showBackground: true,
      colourMode: 'default',
      ...config.annotationStyle
    };
    return config.annotationStyle!;
  });
  // The one colour and light/dark choice, shared by the symbol and its annotation, live on the layer.
  untrack(() => {
    config.colour ??= DEFAULT_COLOUR;
    config.scheme ??= 'light';
  });
  const coords = untrack(() => {
    config.coords ??= [0, 0];
    return config.coords!;
  });

  /** The id this layer had when the modal opened, which doesn't count as taken by another layer. */
  const originalId = untrack(() => config.id);

  /**
   * Whether the id still follows the annotation text. True for a freshly generated id
   * (`symbol` + 5 random characters), and false once the author types their own.
   */
  let isIdAutomatic = $state(untrack(() => /^symbol[a-z0-9]{5}$/.test(config.id ?? '')));

  /** Typing in the id field takes it off automatic. */
  function setCustomId(value: string | undefined) {
    config.id = value;
    isIdAutomatic = false;
  }

  /** Keeps the id unique and in step with the annotation, until the author sets their own. */
  function handleAnnotationInput() {
    if (!isIdAutomatic || !config.annotation?.trim()) return;
    const otherIds = ($jsonBlob?.layers ?? []).map(layer => layer.id).filter(layerId => layerId !== originalId);
    config.id = uniqueLayerId(config.annotation, 'symbol', otherIds);
  }

  /** Resets the colour, and puts the annotation back on its scheme's own colours. */
  function useDefaultColour() {
    config.colour = DEFAULT_COLOUR;
    annotationStyle.colourMode = 'default';
  }

  /** Picking a built-in symbol drops any custom image. */
  function selectSymbol(name: PickerProps['name']) {
    if (!name) return;
    symbolStyle.name = name;
    config.image = undefined;
  }

  /** Choosing a custom image replaces the built-in symbol. Removing it brings the symbol back. */
  function setCustomImage(image: SymbolLayer['image']) {
    config.image = image ? $state.snapshot(image) : undefined;
  }

  // The symbol is only stored without a custom image.
  $effect(() => {
    config.symbol = config.image ? undefined : { ...symbolStyle };
  });

  /** Closing (OK, the close button or the backdrop) keeps the changes, which are already applied. */
  function handleClose() {
    onclose?.();
  }
</script>

<!-- A fixed minimum size, so the modal doesn't resize between tabs. It is capped to the viewport on small screens. -->
<TabbedModal
  {tabs}
  bind:activeId={activeTab}
  onClose={handleClose}
  position="right"
  minWidth="min(600px, 85vw)"
  minHeight="min(600px, 70vh)"
  {footer}
/>

{#snippet footer()}
  <button type="button" onclick={handleClose}>OK</button>
{/snippet}

{#snippet basicsTab()}
  <div class="top-row">
    <fieldset>
      <legend>Symbol</legend>
      <div class="fields">
        <div class="name-field">
          <LayerIdField bind:id={() => config.id, setCustomId} label="Name" showHelp={false} />
        </div>
        <label class="coord-field">
          <span>Longitude</span>
          <input type="number" step="0.0001" bind:value={coords[0]} />
        </label>
        <label class="coord-field">
          <span>Latitude</span>
          <input type="number" step="0.0001" bind:value={coords[1]} />
        </label>
      </div>
    </fieldset>
    <AnimationClockField bind:animationClock={config.animationClock} />
  </div>

  <fieldset>
    <legend>Light / dark</legend>
    <div class="scheme-toggle" role="radiogroup" aria-label="Light or dark">
      <label class="checkbox-field">
        <input type="radio" name="symbol-scheme" value="light" bind:group={config.scheme} />
        Light
      </label>
      <label class="checkbox-field">
        <input type="radio" name="symbol-scheme" value="dark" bind:group={config.scheme} />
        Dark
      </label>
    </div>
    <small class="scheme-help">
      Use light for light maps, like the street map, and dark for dark maps, like a satellite base. Pick whichever suits
      what is on screen at the time. It sets the colours of the symbol and its annotation.
    </small>
  </fieldset>

  <label class="annotation-field">
    <span>Annotation</span>
    <textarea
      rows="4"
      bind:value={config.annotation}
      oninput={handleAnnotationInput}
      placeholder="Text shown beside the symbol"
    ></textarea>
  </label>
{/snippet}

{#snippet annotationOptions()}
  <!-- Two grid cells: the style fieldset under the symbol picker, and anchor point + display under the upload. -->
  <fieldset class="annotation-style">
    <legend>Annotation style</legend>
    <!-- Where the chosen colour goes. Without a background there is nothing else to colour but the text. -->
    <div class="colour-target" role="radiogroup" aria-label="Annotation colours">
      <label class="checkbox-field">
        <input type="radio" name="annotation-colour-mode" value="default" bind:group={annotationStyle.colourMode} />
        Default colours
      </label>
      <label class="checkbox-field">
        <input type="radio" name="annotation-colour-mode" value="text" bind:group={annotationStyle.colourMode} />
        Coloured text
      </label>
      <label class="checkbox-field">
        <input
          type="radio"
          name="annotation-colour-mode"
          value="background"
          disabled={!annotationStyle.showBackground}
          bind:group={annotationStyle.colourMode}
        />
        Coloured background
      </label>
    </div>
  </fieldset>

  <div class="annotation-options">
    <fieldset>
      <legend>Show label on…</legend>
      <!-- Each radio is where the label appears around the symbol. The stored anchor is the opposite: the label's own
           point that sits on the symbol, so a label shown top-right is anchored bottom-left. -->
      <div class="anchor-grid" role="radiogroup" aria-label="Show label on">
        {#each ANNOTATION_ANCHORS as labelPosition (labelPosition)}
          <input
            type="radio"
            name="annotation-label-position"
            title={labelPosition}
            aria-label={labelPosition}
            checked={annotationStyle.anchor === oppositeAnchor(labelPosition)}
            onchange={() => (annotationStyle.anchor = oppositeAnchor(labelPosition))}
          />
        {/each}
      </div>
    </fieldset>

    <fieldset class="annotation-toggles">
      <legend>Display</legend>
      <label class="checkbox-field">
        <input type="checkbox" bind:checked={config.hideSymbol} />
        Hide symbol
      </label>
      <label class="checkbox-field">
        <input type="checkbox" bind:checked={annotationStyle.showBackground} />
        Show background
      </label>
    </fieldset>
  </div>
{/snippet}

{#snippet advancedTab()}
  <!-- Two columns: symbol picker over annotation style on the left, upload over anchor point + display on the right. -->
  <div class="advanced-tab">
    <!-- The one colour for the symbol, and for the annotation when its style uses it. -->
    <fieldset class="colour-section">
      <legend>Colour</legend>
      <ColourPicker bind:colour={config.colour} colours={colours[config.scheme ?? 'light']} fullWidth />
      {#if config.colour !== DEFAULT_COLOUR}
        <button type="button" onclick={useDefaultColour}>Use default colour</button>
      {/if}
    </fieldset>

    <!-- The scheme is chosen on the Symbol tab and saved with the symbol (see lib/symbolImage.ts) -->
    <div class="picker-column">
      <SymbolPicker
        bind:name={() => (config.image ? null : (symbolStyle.name as PickerProps['name'])), selectSymbol}
        bind:variant={symbolStyle.variant}
        bind:colour={config.colour}
        bind:scheme={config.scheme}
        bind:size={symbolStyle.size}
        show={{ colour: false, customColour: false }}
      />
    </div>

    <fieldset class="upload-column">
      <legend>Upload custom symbol</legend>
      <ImageUpload
        bind:value={() => config.image, setCustomImage}
        accept={CUSTOM_SYMBOL_TYPES}
        prompt="Drag and drop an SVG or WebP image, or choose a file. It is shown at half its pixel size (@2x):"
      />
    </fieldset>

    <!-- Nothing is drawn without annotation text, so its options (including hiding the symbol) wait for some. -->
    {#if config.annotation?.trim()}
      {@render annotationOptions()}
    {/if}
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

  /* Two columns: a flexible main one and a fixed side one. Each row of the grid lines up across both. */
  .advanced-tab {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 14rem;
    gap: 1rem;
    align-items: start;
  }

  /* The colour section sits above both columns. */
  .colour-section {
    grid-column: 1 / -1;
    margin: 0;
  }
  .picker-column,
  .upload-column,
  .annotation-style,
  .annotation-options {
    min-width: 0;
    margin: 0;
  }

  /* A single column on narrow screens. */
  @media (max-width: 700px) {
    .advanced-tab {
      grid-template-columns: minmax(0, 1fr);
    }
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

  /* Label position and display, stacked in the side column. */
  .annotation-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* A 3×3 grid of radios, one for each place the label can sit around the symbol. */
  .anchor-grid {
    display: grid;
    grid-template-columns: repeat(3, 1.5rem);
    gap: 0.25rem;
  }

  .anchor-grid input {
    margin: 0;
  }

  .annotation-toggles {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .scheme-toggle {
    display: flex;
    gap: 1rem;
  }

  .scheme-help {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }

  .colour-target {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .annotation-field {
    display: block;
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
    width: 5em;
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
