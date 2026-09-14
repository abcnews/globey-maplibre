import { ClockHistory, Pencil, Trash } from 'svelte-bootstrap-icons';
import type { LayerButton, LayerFeatureDefinition, LayerItemDescriptor } from './types.ts';
import type { DecodedObject } from '../../lib/marker';

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
