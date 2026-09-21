import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import { fetchDownloadObject } from '../../../../lib/fetchDownloadObject.ts';
import { isValidUrl } from '../../../../lib/data/layerHelpers.ts';

/**
 * Fetches and normalizes GeoJSON or TopoJSON data from either a CMID or a URL.
 *
 * @param source Object containing either a cmid (number or string) or a url (string)
 * @returns GeoJSON feature collection or geometry
 */
export async function fetchGeoJsonData(source: { cmid?: number | string; url?: string }): Promise<any> {
  const { cmid, url } = source;
  let rawData: any;

  if (url) {
    if (!isValidUrl(url)) {
      throw new Error(`Invalid or preview URL provided: ${url}`);
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch GeoJSON from ${url}: ${res.status}`);
    }
    rawData = await res.json();
  } else if (cmid) {
    const id = typeof cmid === 'string' ? Number(cmid) : cmid;
    if (!id || isNaN(id) || id <= 0) {
      throw new Error(`Invalid CMID provided: ${cmid}`);
    }
    rawData = await fetchDownloadObject(id);
  } else {
    throw new Error('Neither CMID nor URL provided for GeoJSON source');
  }

  let geojson: any = rawData;
  if (rawData && rawData.type === 'Topology' && rawData.objects) {
    const key = Object.keys(rawData.objects)[0];
    if (key) {
      geojson = feature(rawData, rawData.objects[key]);
    }
  }

  // Ensure every feature has a defined ID for MapLibre setFeatureState
  if (geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    geojson.features.forEach((f: any, index: number) => {
      if (f.id === undefined || f.id === null) {
        f.id = index;
      }
    });
  } else if (geojson && geojson.type === 'Feature') {
    if (geojson.id === undefined || geojson.id === null) {
      geojson.id = 0;
    }
  }

  return geojson;
}

/** Recursively flattens a GeoJSON geometry's nested `coordinates` array into `[lng, lat]` pairs. */
function collectCoordinatePairs(geometry: any, out: [number, number][]): void {
  if (!geometry) return;

  if (geometry.type === 'GeometryCollection') {
    geometry.geometries?.forEach((g: any) => collectCoordinatePairs(g, out));
    return;
  }

  const flatten = (value: any): void => {
    if (typeof value[0] === 'number') {
      out.push([value[0], value[1]]);
    } else {
      value.forEach(flatten);
    }
  };

  if (geometry.coordinates) flatten(geometry.coordinates);
}

/**
 * Extracts every coordinate pair from a fetched GeoJSON/TopoJSON payload (as normalized by
 * `fetchGeoJsonData`), for bounds-fitting — e.g. the "Go to layer" button, which has no
 * stored bounds to work from and must derive them from the live data on each click.
 */
export function getGeoJsonCoordinatePairs(geojson: any): [number, number][] {
  const out: [number, number][] = [];
  const features =
    geojson?.type === 'FeatureCollection'
      ? geojson.features
      : geojson?.type === 'Feature'
        ? [geojson]
        : geojson
          ? [{ geometry: geojson }]
          : [];

  features?.forEach((f: any) => collectCoordinatePairs(f.geometry ?? f, out));

  return out;
}

/** Keeps only features whose geometry type is in `featureTypes` — one source per layer kind. */
export function filterFeaturesType(data: FeatureCollection, featureTypes = ['']) {
  return {
    ...data,
    features: data.features.filter(feature => featureTypes.includes(feature.geometry?.type))
  };
}
