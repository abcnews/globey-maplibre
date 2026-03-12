<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../../components/mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import {
    getColourExpression,
    getCircleRadiusExpression,
    getCircleOpacityExpression,
    getStrokeWidthExpression,
    getStrokeOpacityExpression
  } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  const layerId = $derived(`${sourceId}-circle`);

  $effect(() => {
    // We want to re-run this effect ONLY if the map instance or sourceId changes.
    // data and config changes are handled by other effects.
    const map = mapRoot.map;
    const sid = sourceId;
    const lid = layerId;

    if (!map || !data) return;

    untrack(() => {
      // Add source if it doesn't exist
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: 'geojson',
          data: data
        });
      }

      // Add layer if source exists and layer doesn't
      if (map.getSource(sid) && !map.getLayer(lid)) {
        map.addLayer({
          id: lid,
          type: 'circle',
          source: sid,
          paint: {
            'circle-color': getColourExpression(config, 'marker'),
            'circle-radius': getCircleRadiusExpression(config),
            'circle-opacity': getCircleOpacityExpression(config),
            'circle-stroke-width': getStrokeWidthExpression(config),
            'circle-stroke-color': getColourExpression(config, 'stroke'),
            'circle-stroke-opacity': getStrokeOpacityExpression(config),
            'circle-pitch-scale': 'map',
            'circle-color-transition': { duration: 300 },
            'circle-radius-transition': { duration: 300 },
            'circle-opacity-transition': { duration: 300 },
            'circle-stroke-color-transition': { duration: 300 },
            'circle-stroke-opacity-transition': { duration: 300 }
          }
        });
      }
    });

    return () => {
      untrack(() => {
        if (map.getLayer(lid)) map.removeLayer(lid);
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
    if (map && map.getLayer(lid)) {
      map.setPaintProperty(lid, 'circle-color', getColourExpression(config, 'marker'));
      map.setPaintProperty(lid, 'circle-radius', getCircleRadiusExpression(config));
      map.setPaintProperty(lid, 'circle-opacity', getCircleOpacityExpression(config));
      map.setPaintProperty(lid, 'circle-stroke-width', getStrokeWidthExpression(config));
      map.setPaintProperty(lid, 'circle-stroke-color', getColourExpression(config, 'stroke'));
      map.setPaintProperty(lid, 'circle-stroke-opacity', getStrokeOpacityExpression(config));
    }
  });

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (!map || !map.getLayer(lid)) return;

    const popup = new window.maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: 15
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
    });

    return () => {
      map.off('click', lid, handleEvent);
      popup.remove();
    };
  });
</script>
