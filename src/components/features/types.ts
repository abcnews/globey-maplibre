import type { Component } from 'svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { DecodedObject } from '../../lib/marker';

/**
 * Context passed to a LayerButton's onclick handler.
 */
export interface LayerButtonContext<T = any> {
  /** Decoded marker options object */
  options: DecodedObject;
  /** Current layer item descriptor */
  item: LayerItemDescriptor<T>;
  /** MapLibre map instance if available */
  map?: MapLibreMap;
  /** Starts interactive map click placement */
  startInteractivePlacement: (placement: {
    prompt: string;
    onMapClick: (coords: [number, number], item?: any) => void;
  }) => void;
  /** Opens the layer's configuration modal */
  openModal: () => void;
}

/**
 * Standard button rendered for a layer item in PropLayers.
 */
export interface LayerButton<T = any> {
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
 * Standard descriptor for an item displayed in the PropLayers visual list.
 */
export interface LayerItemDescriptor<T = any> {
  /** Unique ID for the item (e.g. "geojson-123", "icon-106753230-0", "builtin-labels") */
  id: string;
  /** The feature kind identifier (e.g. 'geojson', 'icon', 'image', 'mapLabels', 'customLabels') */
  kind: string;
  /** Primary label displayed in the layer list item */
  name: string;
  /** Secondary description/metadata displayed in the layer list item */
  description: string;
  /** Current stacking z-index */
  zIndex: number;
  /** Reference to the underlying data object (for array items) */
  data?: T;
  /** Custom action buttons for this specific item */
  buttons?: LayerButton<T>[];
}

/**
 * Standard interface implemented by each layer feature module.
 */
export interface LayerFeatureDefinition<T = any> {
  /** Unique identifier matching the feature kind (e.g. 'geojson', 'icon', 'image') */
  kind: string;

  /** Human-readable name for Add menus and builder headers (e.g. 'GeoJSON', 'Icon', 'Image Overlay') */
  label: string;

  /** Display icon component */
  icon: any;

  /** Default base z-index tier from layerManager */
  defaultZIndex: number;

  /** Whether multiple instances can be added as an array in DecodedObject */
  isMultiItem: boolean;

  /** Optional check if the feature can currently be added */
  canAdd?: (options: DecodedObject) => boolean;

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
  buttons?: LayerButton<T>[] | ((item: LayerItemDescriptor<T>, options: DecodedObject) => LayerButton<T>[]);

  /**
   * Generates a new layer object populated with sensible defaults.
   */
  createDefault: (context: { maxZIndex: number; map?: MapLibreMap }) => T;

  /**
   * Extracts layer items from DecodedObject to populate the visual PropList.
   */
  getItems: (options: DecodedObject) => LayerItemDescriptor<T>[];

  /**
   * Updates an item's z-index when reordered in PropLayers.
   */
  setZIndex: (options: DecodedObject, item: LayerItemDescriptor<T>, newZIndex: number) => void;

  /**
   * Adds a newly instantiated layer object to the DecodedObject options.
   */
  add: (options: DecodedObject, item: T) => void;

  /**
   * Checks whether the layer item is valid and populated.
   * If false, empty/unconfigured draft items are automatically cleaned up when the modal closes.
   */
  isValid?: (item: T, options: DecodedObject) => boolean;

  /**
   * Updates an existing layer item with modified data in options.
   */
  update?: (options: DecodedObject, descriptor: LayerItemDescriptor<T>, data: T) => void;

  /**
   * Deletes a layer item from the DecodedObject options.
   */
  delete: (options: DecodedObject, item: LayerItemDescriptor<T>) => void;


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
  /** Decoded marker options */
  options: DecodedObject;
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
  canAdd?: (options: DecodedObject) => boolean;
  /** Associated feature definition if directly mapping to standard feature creation */
  feature?: LayerFeatureDefinition<any>;
  /** Custom modal component for configuring or generating layers before adding */
  CustomModal?: Component<{
    options: DecodedObject;
    map?: MapLibreMap;
    onclose?: (bounds?: [number, number][]) => void;
  }>;
  /** Custom selection handler */
  onSelect?: (context: LayerAddContext) => void;
}


