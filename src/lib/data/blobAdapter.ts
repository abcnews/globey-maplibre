import type { GlobeJsonBlob, GlobeLayer } from './jsonBlob.ts';
import type {
  DecodedObject,
  GeoJsonConfig,
  IconConfig,
  ImageSourceConfig,
  RasterLayerConfig,
  MapLabelsConfig,
  Label
} from '../marker/types.ts';

/**
 * Converts a GlobeJsonBlob (unified data schema) to DecodedObject
 * for rendering in CustomGlobe and interfacing with feature components.
 */
export function blobToDecodedObject(blob: GlobeJsonBlob | null | undefined): DecodedObject {
  if (!blob) {
    return {
      coords: [0, 0],
      z: 2,
      base: 'satellite',
      projection: 'globe',
      satelliteVariant: 'blue'
    };
  }

  const map = blob.map;
  const layers = blob.layers || [];

  const geoJson: GeoJsonConfig[] = [];
  const icons: IconConfig[] = [];
  const imageSources: ImageSourceConfig[] = [];
  const rasterLayers: RasterLayerConfig[] = [];
  let customLabels: Label[] = [];
  let labelsZIndex: number | undefined;
  let mapLabels: MapLabelsConfig | undefined;
  let mapLabelsZIndex: number | undefined;
  let hideOsm: boolean | undefined;
  let streetMapZIndex: number | undefined;

  // Array position (flat across every layer kind) becomes each item's zIndex — a
  // geojson layer at blob index 3 gets zIndex 3 even if other-kind layers sit at
  // indices 0-2. This preserves true cross-kind ordering, not per-kind-relative.
  layers.forEach((layer, index) => {
    switch (layer.type) {
      case 'geojson':
        geoJson.push({
          id: layer.id,
          cmid: layer.cmid,
          url: layer.url,
          type: layer.geometryType,
          colourMode: layer.colourMode,
          colourProp: layer.colourProp,
          colourConfig: layer.colourConfig as any,
          isOpaque: layer.isOpaque,
          filter: layer.filter as any,
          pointSize: layer.pointSize as any,
          lineWidth: layer.lineWidth as any,
          spike: layer.spike as any,
          zIndex: index,
          animationClock: layer.animationClock
        });
        break;

      case 'icon':
        icons.push({
          id: layer.id,
          cmid: layer.cmid,
          coords: layer.coords,
          zIndex: index,
          animationClock: layer.animationClock
        });
        break;

      case 'image':
        imageSources.push({
          id: layer.id,
          url: layer.url,
          coordinates: layer.coordinates as any,
          zIndex: index,
          animationClock: layer.animationClock
        });
        break;

      case 'raster':
        rasterLayers.push({
          url: layer.url,
          maxZoom: layer.maxZoom,
          tileSize: layer.tileSize,
          attribution: layer.attribution,
          zIndex: index,
          animationClock: layer.animationClock
        });
        break;

      case 'customLabels':
        customLabels = (layer.labels || []).map(l => ({
          name: l.name,
          coords: l.coords,
          style: l.style,
          number: l.number
        }));
        labelsZIndex = index;
        break;

      case 'mapLabels':
        mapLabels = {
          countriesMajor: layer.countriesMajor,
          countriesMedium: layer.countriesMedium,
          countriesMinor: layer.countriesMinor,
          continents: layer.continents,
          states: layer.states,
          cities: layer.cities,
          towns: layer.towns,
          oceans: layer.oceans,
          nationalBoundaries: layer.nationalBoundaries,
          stateBoundaries: layer.stateBoundaries
        };
        if (!layer.enabled) {
          (mapLabels as any)._disabled = true;
        }
        mapLabelsZIndex = index;
        break;

      case 'streetMap':
        hideOsm = layer.hideOsm;
        streetMapZIndex = index;
        break;
    }
  });

  return {
    coords: map.coords ?? [0, 0],
    z: map.z ?? 2,
    bounds: map.bounds ?? [],
    base: map.base === 'street' ? 'street' : 'satellite',
    projection: map.projection ?? 'globe',
    satelliteVariant: map.satelliteVariant ?? 'blue',
    attribution: map.attribution ?? '',
    animationDuration: map.animationDuration ?? 500,
    fitGlobe: map.fitGlobe ?? false,
    constrainView: map.constrainView ?? false,
    minimap: map.minimap ? { enabled: map.minimap.enabled, bounds: map.minimap.bounds } : undefined,
    geoJson,
    icons,
    imageSources,
    rasterLayers,
    labels: customLabels,
    labelsZIndex,
    mapLabels,
    mapLabelsZIndex,
    hideOsm,
    streetMapZIndex
  };
}

/**
 * Updates a GlobeJsonBlob with changes made to a DecodedObject.
 * Preserves extra metadata on layers while updating layer arrays and map coordinates.
 */
export function decodedObjectToBlob(
  currentBlob: GlobeJsonBlob,
  options: DecodedObject
): GlobeJsonBlob {
  // Collect every layer with the DecodedObject-side zIndex it should sort by, then
  // sort once and strip that number back out — GlobeLayer has no zIndex field, its
  // array position *is* the stacking order. Items missing a zIndex (freshly added,
  // not yet reordered) default to Infinity so they land on top rather than buried
  // at the bottom; Array.sort is stable, so multiple such items keep insertion order.
  const entries: { zIndex: number; layer: GlobeLayer }[] = [];

  (options.geoJson || []).forEach(gj => {
    entries.push({
      zIndex: gj.zIndex ?? Infinity,
      layer: {
        id: gj.id || `geojson-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'geojson',
        cmid: gj.cmid,
        url: gj.url,
        geometryType: (gj.type as any) || 'areas',
        colourMode: (gj.colourMode as any) || 'simple',
        colourProp: gj.colourProp,
        colourConfig: gj.colourConfig as any,
        isOpaque: gj.isOpaque ?? false,
        filter: gj.filter as any,
        pointSize: gj.pointSize as any,
        lineWidth: gj.lineWidth as any,
        spike: gj.spike as any,
        animationClock: gj.animationClock
      }
    });
  });

  (options.icons || []).forEach(ic => {
    entries.push({
      zIndex: ic.zIndex ?? Infinity,
      layer: {
        id: ic.id || `icon-${ic.cmid}-${Date.now()}`,
        type: 'icon',
        cmid: ic.cmid,
        coords: ic.coords,
        animationClock: ic.animationClock
      }
    });
  });

  (options.imageSources || []).forEach(img => {
    entries.push({
      zIndex: img.zIndex ?? Infinity,
      layer: {
        id: img.id || `image-${Date.now()}`,
        type: 'image',
        url: img.url,
        coordinates: (img.coordinates as any) || [],
        animationClock: img.animationClock
      }
    });
  });

  (options.rasterLayers || []).forEach(r => {
    entries.push({
      zIndex: r.zIndex ?? Infinity,
      layer: {
        id: `raster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'raster',
        url: r.url,
        maxZoom: r.maxZoom ?? 7,
        tileSize: r.tileSize ?? 256,
        attribution: r.attribution ?? '',
        animationClock: r.animationClock
      }
    });
  });

  if (options.labels && options.labels.length > 0) {
    entries.push({
      zIndex: options.labelsZIndex ?? Infinity,
      layer: {
        id: 'custom-labels',
        name: 'Custom Labels',
        type: 'customLabels',
        labels: options.labels.map(l => ({
          name: l.name,
          coords: l.coords,
          style: l.style ?? 'country-large',
          number: l.number ?? 0
        }))
      }
    });
  }

  if (options.mapLabels) {
    entries.push({
      zIndex: options.mapLabelsZIndex ?? Infinity,
      layer: {
        id: 'builtin-map-labels',
        name: 'Map Labels',
        type: 'mapLabels',
        enabled: !(options.mapLabels as any)?._disabled,
        countriesMajor: options.mapLabels.countriesMajor ?? true,
        countriesMedium: options.mapLabels.countriesMedium ?? true,
        countriesMinor: options.mapLabels.countriesMinor ?? true,
        continents: options.mapLabels.continents ?? false,
        states: options.mapLabels.states ?? false,
        cities: options.mapLabels.cities ?? false,
        towns: options.mapLabels.towns ?? false,
        oceans: options.mapLabels.oceans ?? false,
        nationalBoundaries: options.mapLabels.nationalBoundaries ?? false,
        stateBoundaries: options.mapLabels.stateBoundaries ?? false
      }
    });
  }

  if (options.hideOsm !== undefined || options.streetMapZIndex !== undefined) {
    entries.push({
      zIndex: options.streetMapZIndex ?? Infinity,
      layer: {
        id: 'street-map',
        name: 'Street Map',
        type: 'streetMap',
        hideOsm: options.hideOsm ?? false
      }
    });
  }

  const newLayers = entries.sort((a, b) => a.zIndex - b.zIndex).map(e => e.layer);

  return {
    ...currentBlob,
    map: {
      ...currentBlob.map,
      coords: options.coords,
      z: options.z,
      bounds: options.bounds,
      base: (options.base as any) ?? currentBlob.map.base,
      projection: (options.projection as any) ?? currentBlob.map.projection,
      satelliteVariant: (options.satelliteVariant as any) ?? currentBlob.map.satelliteVariant,
      attribution: options.attribution ?? currentBlob.map.attribution,
      animationDuration: options.animationDuration ?? currentBlob.map.animationDuration,
      fitGlobe: options.fitGlobe ?? currentBlob.map.fitGlobe,
      constrainView: options.constrainView ?? currentBlob.map.constrainView,
      minimap: options.minimap
        ? { enabled: options.minimap.enabled ?? true, bounds: options.minimap.bounds ?? [] }
        : undefined
    },
    layers: newLayers
  };
}
