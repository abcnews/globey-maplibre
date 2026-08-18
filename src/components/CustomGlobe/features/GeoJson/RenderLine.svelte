<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import { Popup, type Map, type GeoJSONSource } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColourExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    setLayerZIndex,
    Z_INDEX_GEOJSON,
    SUB_LAYER_OUTLINE_OFFSET
  } from '../layerUtils';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let {
    data,
    config,
    sourceId,
    zIndex = Z_INDEX_GEOJSON
  }: {
    data: any;
    config: GeoJsonConfig;
    sourceId: string;
    zIndex?: number;
  } = $props();

  const layerId = $derived(`${sourceId}-line`);
  const outlineLayerId = $derived(`${sourceId}-line-outline`);

  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const lid = layerId;
    const olid = outlineLayerId;

    if (!map || !data) return;

    untrack(() => {
      // Initialize Source
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: 'geojson',
          data: data
        });
      }

      const targetZ = zIndex ?? Z_INDEX_GEOJSON;

      // Initialize Outline Layer (placed slightly below main stroke)
      if (map.getSource(sid) && !map.getLayer(olid)) {
        addLayerWithZIndex(
          map,
          {
            id: olid,
            type: 'line',
            source: sid,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#ffffff',
              'line-opacity': getStrokeOpacityExpression(config),
              'line-width': ['+', getStrokeWidthExpression(config), 2]
            }
          },
          targetZ - SUB_LAYER_OUTLINE_OFFSET
        );
      }

      // Initialize Main Line Layer
      if (map.getSource(sid) && !map.getLayer(lid)) {
        addLayerWithZIndex(
          map,
          {
            id: lid,
            type: 'line',
            source: sid,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': getColourExpression(config, 'stroke'),
              'line-opacity': getStrokeOpacityExpression(config),
              'line-width': getStrokeWidthExpression(config),
              'line-color-transition': { duration: 300 },
              'line-opacity-transition': { duration: 300 }
            }
          },
          targetZ
        );
      }
    });

    return () => {
      removeLayerWithZIndex(map, lid);
      removeLayerWithZIndex(map, olid);
      if (map.getSource(sid)) map.removeSource(sid);
    };
  });

  // Update Data
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    if (map && map.getSource(sid) && data) {
      (map.getSource(sid) as GeoJSONSource).setData(data);
    }
  });

  // Update Styles
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    const olid = outlineLayerId;
    if (map) {
      if (map.getLayer(olid)) {
        map.setPaintProperty(olid, 'line-opacity', getStrokeOpacityExpression(config));
        map.setPaintProperty(olid, 'line-width', ['+', getStrokeWidthExpression(config), 2]);
      }
      if (map.getLayer(lid)) {
        map.setPaintProperty(lid, 'line-color', getColourExpression(config, 'stroke'));
        map.setPaintProperty(lid, 'line-opacity', getStrokeOpacityExpression(config));
        map.setPaintProperty(lid, 'line-width', getStrokeWidthExpression(config));
      }
    }
  });

  // Update Z-Index when changed
  $effect(() => {
    const map = mapRoot.map;
    const targetZ = zIndex;
    const lid = layerId;
    const olid = outlineLayerId;
    if (!map || targetZ === undefined) return;

    if (map.getLayer(olid)) setLayerZIndex(map, olid, targetZ - SUB_LAYER_OUTLINE_OFFSET);
    if (map.getLayer(lid)) setLayerZIndex(map, lid, targetZ);
  });

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (!map || !map.getLayer(lid)) return;

    const popup = new Popup({
      closeButton: false,
      closeOnClick: true
    });

    const handleEvent = (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const title = feature.properties?.title || feature.properties?.name;
      const description = feature.properties?.description;

      if (title || description) {
        let content = '';
        if (title) content += `<strong>${title}</strong><br>`;
        if (description) content += description;

        popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
      }
    };

    map.on('click', lid, handleEvent);
    map.on('mouseenter', lid, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', lid, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    return () => {
      map.off('click', lid, handleEvent);
      popup.remove();
    };
  });
</script>
