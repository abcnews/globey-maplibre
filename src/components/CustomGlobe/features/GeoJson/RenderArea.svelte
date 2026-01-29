<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import {
    getColourExpression,
    getFillOpacityExpression,
    getStrokeOpacityExpression,
    getStrokeWidthExpression
  } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  const layerId = $derived(`${sourceId}-fill`);
  const outlineLayerId = $derived(`${sourceId}-outline`);

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

      // Initialize Layers
      if (map.getSource(sid)) {
        if (!map.getLayer(lid)) {
          map.addLayer({
            id: lid,
            type: 'fill',
            source: sid,
            paint: {
              'fill-color': getColourExpression(config, 'fill'),
              'fill-opacity': getFillOpacityExpression(config),

              'fill-color-transition': { duration: 300 },
              'fill-opacity-transition': { duration: 300 }
            }
          });
        }

        if (!map.getLayer(olid)) {
          map.addLayer({
            id: olid,
            type: 'line',
            source: sid,
            paint: {
              'line-color': getColourExpression(config, 'stroke'),

              'line-width': getStrokeWidthExpression(config),
              'line-opacity': getStrokeOpacityExpression(config),
              'line-width-transition': { duration: 300 },
              'line-color-transition': { duration: 300 },
              'line-opacity-transition': { duration: 300 }
            }
          });
        }
      }
    });

    return () => {
      untrack(() => {
        if (map.getLayer(lid)) map.removeLayer(lid);
        if (map.getLayer(olid)) map.removeLayer(olid);
        if (map.getSource(sid)) map.removeSource(sid);
      });
    };
  });

  // Update Data
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    if (map && map.getSource(sid) && data) {
      (map.getSource(sid) as maplibregl.GeoJSONSource).setData(data);
    }
  });

  // Update Styles
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    const olid = outlineLayerId;

    if (map && map.getLayer(lid)) {
      map.setPaintProperty(lid, 'fill-color', getColourExpression(config, 'fill'));
      map.setPaintProperty(lid, 'fill-opacity', getFillOpacityExpression(config));
    }
    if (map && map.getLayer(olid)) {
      map.setPaintProperty(olid, 'line-color', getColourExpression(config, 'stroke'));

      map.setPaintProperty(olid, 'line-width', getStrokeWidthExpression(config));
      map.setPaintProperty(olid, 'line-opacity', getStrokeOpacityExpression(config));
    }
  });

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (!map || !map.getLayer(lid)) return;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true
    });

    const handleEvent = (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const title = feature.properties?.title;
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
