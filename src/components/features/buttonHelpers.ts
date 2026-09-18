import { ClockHistory, Pencil, PinAngle, Trash } from 'svelte-bootstrap-icons';
import type { LayerButton, LayerFeatureDefinition, LayerItemDescriptor } from './types.ts';
import type { DecodedObject } from '../../lib/marker';
import { safeFitBounds, safeFlyTo } from '../Builder/utils.ts';
import { getBoundingBox } from './PanZoom/utils.ts';

/**
 * Creates a standard Edit action button that opens the feature's configuration modal.
 */
export function createEditButton<T = any>({
  title = 'Edit',
  ariaLabel
}: { title?: string; ariaLabel?: string } = {}): LayerButton<T> {
  return {
    id: 'edit',
    title,
    ariaLabel: ariaLabel || title,
    icon: Pencil,
    onclick: ({ openModal }) => {
      openModal();
    }
  };
}

/**
 * Creates a standard Delete action button that removes the layer item.
 */
export function createDeleteButton<T = any>({
  title = 'Delete',
  ariaLabel
}: { title?: string; ariaLabel?: string } = {}): LayerButton<T> {
  return {
    id: 'delete',
    title,
    ariaLabel: ariaLabel || title,
    icon: Trash,
    onclick: ({ options, item }) => {
      const feature = (item as any).feature as LayerFeatureDefinition<T> | undefined;
      if (feature?.delete) {
        feature.delete(options, item);
      }
    }
  };
}

/**
 * Opens the shared clock/name modal for a layer item, where the reader picks
 * between the two animation clocks — scroll-tied (the default) scrubs the
 * layer's fade with scroll position, play-on-arrival holds until the reader
 * reaches the marker then plays the fade over the panel's `animationDuration`
 * — and sets an optional friendly name for the layer.
 */
export function createClockButton<T = any>(item: LayerItemDescriptor<T>): LayerButton<T> {
  return {
    id: 'clock',
    title: 'Layer settings (animation clock, name)',
    ariaLabel: 'Layer settings',
    icon: ClockHistory,
    onclick: ({ openClockModal }) => {
      openClockModal();
    }
  };
}

/** Where a "go to layer" click should fly/fit the map to. */
export type GoToTarget = { type: 'point'; coords: [number, number] } | { type: 'bounds'; bounds: [number, number][] };

/**
 * Creates a standard "Go to layer" action button that flies/fits the map to wherever the
 * layer item currently is. `getTarget` may resolve synchronously (icon/image/raster, which
 * already store their own coordinates) or asynchronously (GeoJSON, which has no stored bounds
 * and must be re-fetched on every click to compute them).
 */
export function createGoToButton<T = any>({
  title = 'Go to layer',
  getTarget
}: {
  title?: string;
  getTarget: (item: LayerItemDescriptor<T>) => GoToTarget | undefined | Promise<GoToTarget | undefined>;
}): LayerButton<T> {
  return {
    id: 'goto',
    title,
    ariaLabel: title,
    icon: PinAngle,
    onclick: ({ item, map }) => {
      if (!map) return;

      Promise.resolve(getTarget(item))
        .then(target => {
          if (!target || !map) return;

          if (target.type === 'point') {
            safeFlyTo(map, { center: target.coords, zoom: Math.max(map.getZoom(), 6) });
          } else {
            const { minLng, minLat, maxLng, maxLat } = getBoundingBox(target.bounds);
            safeFitBounds(
              map,
              [
                [minLng, minLat],
                [maxLng, maxLat]
              ],
              { padding: 50 }
            );
          }
        })
        .catch(err => console.error('[createGoToButton] Failed to resolve go-to target:', err));
    }
  };
}

/**
 * Resolves the default action buttons for a feature item if none are explicitly declared.
 */
export function getDefaultLayerButtons<T = any>(
  feature: LayerFeatureDefinition<T>,
  item?: LayerItemDescriptor<T>,
  _options?: DecodedObject
): LayerButton<T>[] {
  const buttons: LayerButton<T>[] = [];
  // Only the multi-item features carry a per-item `animationClock`; the
  // singletons (map labels, custom labels, street map) have nowhere to store it.
  if (feature.isMultiItem && item?.data) {
    buttons.push(createClockButton<T>(item));
  }
  if (feature.ConfigModal) {
    buttons.push(createEditButton<T>());
  }
  buttons.push(createDeleteButton<T>());
  return buttons;
}
