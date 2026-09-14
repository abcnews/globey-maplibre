import type { Component } from 'svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';

/** Props every custom layer plugin component receives from CustomGlobe. */
export interface CustomLayerProps<TConfig = unknown> {
  map: MapLibreMap;
  config: TConfig;
  zIndex?: number;
}

/** A consumer-defined layer kind: a Svelte component managing its own MapLibre layer lifecycle. */
export type CustomLayerPlugin<TConfig = unknown> = Component<CustomLayerProps<TConfig>>;

/** An entry in CustomGlobe's `plugins` prop, pairing a plugin component with its config. */
export interface CustomLayerRegistration<TConfig = unknown> {
  id: string;
  component: CustomLayerPlugin<TConfig>;
  config: TConfig;
  zIndex?: number;
}
