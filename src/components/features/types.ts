import type { Component } from 'svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GlobeJsonBlob, GlobeLayer } from '../../lib/data/jsonBlob.ts';

/**
 * Context passed to a LayerButton's onclick handler.
 */
export interface LayerButtonContext<T extends GlobeLayer = GlobeLayer> {
  /** The working blob draft — mutate it directly; `mutateBlob` commits it */
  options: GlobeJsonBlob;
  /** Current layer item descriptor */
  item: LayerItemDescriptor<T>;
  /** MapLibre map instance if available */
  map?: MapLibreMap;
  /** Starts interactive map click placement */
  startInteractivePlacement: (placement: {
    prompt: string;
    /** `options` is a fresh draft supplied at actual click time, not the stale one from button-click time */
    onMapClick: (coords: [number, number], item: T, options: GlobeJsonBlob) => void;
  }) => void;
  /**
   * Opens the layer's configuration modal. Pass the mutated draft/options directly
   * (e.g. from an interactive-placement `onMapClick`) rather than relying on the
   * live store — calling this before the enclosing `mutateBlob` commits would
   * otherwise reopen the modal with a stale, pre-mutation snapshot.
   */
  openModal: (options?: GlobeJsonBlob) => void;
}

/**
 * Standard button rendered for a layer item in PropLayers.
 */
export interface LayerButton<T extends GlobeLayer = GlobeLayer> {
  /** Unique identifier for the action button */
  id: string;
  /** Hover tooltip text */
  title: string;
  /** Accessible ARIA label (falls back to title if omitted) */
  ariaLabel?: string;
  /** Svelte icon component */
  icon: any;
  /** Click action callback */
  onclick: (context: LayerButtonContext<T>) => void;
}

/**
 * One row of the Builder's visual layer list. Built generically from a blob layer by
 * `describeLayer()` (`layerOps.ts`) — there is one descriptor per layer, for every kind.
 */
export interface LayerItemDescriptor<T extends GlobeLayer = GlobeLayer> {
  /** The layer's own blob id */
  id: string;
  /** The feature kind identifier, i.e. the blob layer's `type` discriminant */
  kind: GlobeLayer['type'];
  /** Primary label displayed in the layer list item */
  name: string;
  /** Position in `GlobeJsonBlob.layers`; index 0 is the bottom of the stack */
  index: number;
  /** The blob layer itself */
  data: T;
  /** Custom action buttons for this specific item */
  buttons?: LayerButton<T>[];
}

/**
 * Standard interface implemented by each layer feature module.
 *
 * Adding, deleting, updating and reordering are **not** part of this interface: every layer
 * kind lives in the same `GlobeJsonBlob.layers` array, so those are generic array operations
 * in `layerOps.ts`. A feature only describes what is genuinely kind-specific.
 */
export interface LayerFeatureDefinition<T extends GlobeLayer = GlobeLayer> {
  /** The blob layer `type` this feature owns (e.g. 'geojson', 'icon', 'image') */
  kind: T['type'];

  /** Human-readable name for Add menus and builder headers (e.g. 'GeoJSON', 'Icon', 'Image Overlay') */
  label: string;

  /** Display icon component */
  icon: any;

  /** Whether several layers of this kind can coexist. Singletons are only addable when absent. */
  isMultiItem: boolean;

  /** Optional extra check if the feature can currently be added, on top of the `isMultiItem` rule */
  canAdd?: (options: GlobeJsonBlob) => boolean;

  /**
   * Optional interactive map placement workflow before opening the config modal.
   * E.g. Icons allow clicking on the map to set initial coordinates.
   */
  interactivePlacement?: {
    prompt: string;
    onMapClick: (coords: [number, number], item: T) => void;
  };

  /**
   * Optional action buttons or action button factory function for layer items.
   */
  buttons?: LayerButton<T>[] | ((item: LayerItemDescriptor<T>, options: GlobeJsonBlob) => LayerButton<T>[]);

  /**
   * Generates a new layer, with a fresh id, populated with sensible defaults.
   * It is appended to the top of the stack by `addLayer()`.
   */
  createDefault: (context: { map?: MapLibreMap }) => T;

  /**
   * Checks whether the layer is valid and populated.
   * If false, empty/unconfigured draft layers are automatically cleaned up when the modal closes.
   */
  isValid?: (item: T, options: GlobeJsonBlob) => boolean;

  /**
   * Svelte modal component for editing or configuring this layer (prefixed with Builder).
   */
  ConfigModal?: Component<{
    config: any;
    map?: MapLibreMap;
    onclose?: (bounds?: [number, number][]) => void;
  }>;

  /**
   * The layer's map-rendering component. Metadata only — CustomGlobe imports each
   * handler directly and passes whatever props it needs, so the prop shape varies
   * per feature.
   */
  MapRenderer?: Component<any>;
}

/**
 * Context passed when selecting an item from the Add Layer menu.
 */
export interface LayerAddContext {
  /** The working blob draft */
  options: GlobeJsonBlob;
  /** MapLibre map instance if available */
  map?: MapLibreMap;
  /** Function to open a custom modal */
  openModal: (modal: Component<any>, props?: Record<string, any>) => void;
}

/**
 * Descriptor for an entry in the Builder "Add Layer" menu.
 */
export interface LayerAddMenuItem {
  /** Unique ID for the add menu entry */
  id: string;
  /** Display label in the menu */
  label: string;
  /** Svelte icon component */
  icon: any;
  /** Optional check if the item can currently be added */
  canAdd?: (options: GlobeJsonBlob) => boolean;
  /** Associated feature definition if directly mapping to standard feature creation */
  feature?: LayerFeatureDefinition<any>;
  /** Custom modal component for configuring or generating layers before adding */
  CustomModal?: Component<{
    options: GlobeJsonBlob;
    map?: MapLibreMap;
    onclose?: (bounds?: [number, number][]) => void;
  }>;
  /** Custom selection handler */
  onSelect?: (context: LayerAddContext) => void;
}
