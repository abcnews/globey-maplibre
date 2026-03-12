<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../../components/mapLibre/index';
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
      const colorExpr = getColourExpression(config, 'fill');
      const opacityExpr = getFillOpacityExpression(config);
      console.log(`[GeoJSON] Updating fill layer ${lid}`, { colorExpr, opacityExpr });
      map.setPaintProperty(lid, 'fill-color', colorExpr);
      map.setPaintProperty(lid, 'fill-opacity', opacityExpr);
    }
    if (map && map.getLayer(olid)) {
      const colorExpr = getColourExpression(config, 'stroke');
      const widthExpr = getStrokeWidthExpression(config);
      const opacityExpr = getStrokeOpacityExpression(config);
      console.log(`[GeoJSON] Updating outline layer ${olid}`, { colorExpr, widthExpr, opacityExpr });
      map.setPaintProperty(olid, 'line-color', colorExpr);
      map.setPaintProperty(olid, 'line-width', widthExpr);
      map.setPaintProperty(olid, 'line-opacity', opacityExpr);
    }
  });

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (!map || !map.getLayer(lid)) return;

    const popup = new window.maplibregl.Popup({
      closeButton: false,
      closeOnClick: true
    });

    const handleEvent = (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      console.log('[GeoJSON] Feature clicked:', feature.properties);

      const title = feature.properties?.title || feature.properties?.name || 'Area';
      const description = feature.properties?.description || '';

      let content = `<strong>${title}</strong>`;
      if (description) content += `<br>${description}`;

      // Add a property list for debugging
      content += `<hr><div style="font-size: 10px; font-family: monospace; max-height: 100px; overflow-y: auto;">`;
      for (const [key, val] of Object.entries(feature.properties)) {
        content += `<b>${key}:</b> ${val}<br>`;
      }
      content += `</div>`;

      popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
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
