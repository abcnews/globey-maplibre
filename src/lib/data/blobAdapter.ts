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

  layers.forEach(layer => {
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
          opacity: layer.opacity,
          isOpaque: layer.isOpaque,
          filter: layer.filter as any,
          pointSize: layer.pointSize as any,
          lineWidth: layer.lineWidth as any,
          spike: layer.spike as any,
          zIndex: layer.zIndex,
          animationClock: layer.animationClock
        });
        break;

      case 'icon':
        icons.push({
          id: layer.id,
          cmid: layer.cmid,
          coords: layer.coords,
          zIndex: layer.zIndex,
          animationClock: layer.animationClock
        });
        break;

      case 'image':
        imageSources.push({
          id: layer.id,
          url: layer.url,
          opacity: layer.opacity,
          coordinates: layer.coordinates as any,
          zIndex: layer.zIndex,
          animationClock: layer.animationClock
        });
        break;

      case 'raster':
        rasterLayers.push({
          url: layer.url,
          maxZoom: layer.maxZoom,
          tileSize: layer.tileSize,
          attribution: layer.attribution,
          zIndex: layer.zIndex,
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
        labelsZIndex = layer.zIndex;
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
        mapLabelsZIndex = layer.zIndex;
        break;

      case 'streetMap':
        hideOsm = layer.hideOsm;
        streetMapZIndex = layer.zIndex;
        break;
    }
  });

  return {
    coords: map.coords ?? [0, 0],
    z: map.z ?? 2,
    bounds: map.bounds ?? [],
    base: map.base ?? 'satellite',
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
  const newLayers: GlobeLayer[] = [];

  // 1. GeoJSON layers
  (options.geoJson || []).forEach(gj => {
    newLayers.push({
      id: gj.id || `geojson-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'geojson',
      cmid: gj.cmid,
      url: gj.url,
      geometryType: (gj.type as any) || 'areas',
      colourMode: (gj.colourMode as any) || 'simple',
      colourProp: gj.colourProp,
      colourConfig: gj.colourConfig as any,
      opacity: gj.opacity ?? 1,
      isOpaque: gj.isOpaque ?? false,
      filter: gj.filter as any,
      pointSize: gj.pointSize as any,
      lineWidth: gj.lineWidth as any,
      spike: gj.spike as any,
      zIndex: gj.zIndex ?? 0,
      animationClock: gj.animationClock
    });
  });

  // 2. Icon layers
  (options.icons || []).forEach(ic => {
    newLayers.push({
      id: ic.id || `icon-${ic.cmid}-${Date.now()}`,
      type: 'icon',
      cmid: ic.cmid,
      coords: ic.coords,
      zIndex: ic.zIndex ?? 0,
      animationClock: ic.animationClock
    });
  });

  // 3. Image sources
  (options.imageSources || []).forEach(img => {
    newLayers.push({
      id: img.id || `image-${Date.now()}`,
      type: 'image',
      url: img.url,
      opacity: img.opacity ?? 1,
      coordinates: (img.coordinates as any) || [],
      zIndex: img.zIndex ?? 0,
      animationClock: img.animationClock
    });
  });

  // 4. Raster layers
  (options.rasterLayers || []).forEach(r => {
    newLayers.push({
      id: `raster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'raster',
      url: r.url,
      maxZoom: r.maxZoom ?? 7,
      tileSize: r.tileSize ?? 256,
      attribution: r.attribution ?? '',
      zIndex: r.zIndex ?? 0,
      animationClock: r.animationClock
    });
  });

  // 5. Custom labels
  if (options.labels && options.labels.length > 0) {
    newLayers.push({
      id: 'custom-labels',
      name: 'Custom Labels',
      type: 'customLabels',
      zIndex: options.labelsZIndex ?? 600,
      labels: options.labels.map(l => ({
        name: l.name,
        coords: l.coords,
        style: l.style ?? 'country-large',
        number: l.number ?? 0
      }))
    });
  }

  // 6. Built-in map labels
  if (options.mapLabels) {
    newLayers.push({
      id: 'builtin-map-labels',
      name: 'Map Labels',
      type: 'mapLabels',
      zIndex: options.mapLabelsZIndex ?? 500,
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
    });
  }

  // 7. Street map
  if (options.hideOsm !== undefined || options.streetMapZIndex !== undefined) {
    newLayers.push({
      id: 'street-map',
      name: 'Street Map',
      type: 'streetMap',
      zIndex: options.streetMapZIndex ?? 200,
      hideOsm: options.hideOsm ?? false
    });
  }

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
