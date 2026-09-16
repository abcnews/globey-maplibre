import type { Map as MapLibreMap } from 'maplibre-gl';
import { addLayerWithZIndex } from './layerUtils.ts';
import { tweenStopsExpression } from '../Tween/utils.ts';

/**
 * One item that appears in one or more panels, resolved for the whole-layer fade
 * pattern: its config, an opacity per panel (0 where the item is absent), an
 * optional coordinate per panel, and a `{#each}` key that only changes on a real
 * config change.
 */
export interface TweenedLayerEntry<Config, Coord> {
  key: string;
  index: number;
  /** First panel that has this item — used for layer type / URL / z-index. */
  representative: Config;
  /** Opacity per panel; `0` where the item is absent. */
  opacityStops: number[];
  /** Coordinate per panel; `null` where absent. Empty when `coordsOf` is omitted. */
  coordStops: (Coord | null)[];
  /** This item's own config per panel; `undefined` where absent — lets a handler tween any
   *  other per-panel property itself (e.g. GeoJson colour) beyond opacity/coords. */
  configStops: (Config | undefined)[];
  /** `{#each}` key. */
  sig: string;
}

/**
 * Turns per-panel config arrays into one entry per distinct item (first-seen
 * order). Used by `MapRastersHandler`, `ImageSourcesHandler` and `IconsHandler`.
 *
 * @param perPanel One config array per panel (length 1 on the builder path).
 */
export function buildTweenedLayerEntries<Config, Coord = never>(
  perPanel: Config[][],
  opts: {
    keyOf: (config: Config) => string;
    opacityOf?: (config: Config) => number;
    coordsOf?: (config: Config) => Coord;
  }
): TweenedLayerEntry<Config, Coord>[] {
  const opacityOf = opts.opacityOf ?? (() => 1);
  const keys = [...new Set(perPanel.flat().map(opts.keyOf).filter(Boolean))];

  return keys.map((key, index) => {
    const perPanelConfig = perPanel.map(list => list.find(config => opts.keyOf(config) === key));
    return {
      key,
      index,
      representative: perPanelConfig.find(Boolean) as Config,
      opacityStops: perPanelConfig.map(config => (config ? opacityOf(config) : 0)),
      coordStops: opts.coordsOf ? perPanelConfig.map(config => (config ? opts.coordsOf!(config) : null)) : [],
      configStops: perPanelConfig,
      sig: `${key}|${JSON.stringify(perPanelConfig.map(config => config ?? null))}`
    };
  });
}

/**
 * Adds a layer whose opacity fades with a clock's global-state: `opacityKey` is
 * set to `tweenStopsExpression(opacityStops, posKey)` in the paint. `posKey`
 * comes from the item's `animationClock` via `layerClockKey`, so layers on
 * different clocks can coexist — both uniforms are written every frame.
 */
export function addFadingLayer(
  map: MapLibreMap,
  layer: {
    id: string;
    source: string;
    type: 'raster' | 'symbol';
    layout?: Record<string, unknown>;
    paint?: Record<string, unknown>;
    opacityKey: string;
    opacityStops: number[];
    /** Global-state key of the clock this layer's fade follows. */
    posKey: string;
  },
  zIndex: number
): void {
  const { opacityKey, opacityStops, posKey, ...spec } = layer;
  const opacityExpression = tweenStopsExpression(opacityStops, posKey);

  addLayerWithZIndex(
    map,
    {
      ...spec,
      paint: { ...(spec.paint ?? {}), [opacityKey]: opacityExpression }
    } as any,
    zIndex
  );
}

/**
 * The stop for the panel currently being entered, falling back to the first
 * defined stop, then a caller-supplied default. Used to snap image / icon
 * positions at the panel boundary.
 */
export function pickStop<T>(stops: (T | null)[], index: number, fallback: T): T {
  return stops[index] ?? stops.find((stop): stop is T => stop != null) ?? fallback;
}
