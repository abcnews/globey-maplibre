import { Bezier2, Pencil, Trash, Vr } from 'svelte-bootstrap-icons';
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
 * Creates a toggle between the two animation clocks for a layer. Scroll-tied
 * (the default) scrubs the layer's fade with scroll position; play-on-arrival
 * holds until the reader reaches the marker, then plays the fade over the
 * panel's `animationDuration`. Absent means scroll-tied, so the toggle only ever
 * writes `'immediate'` or clears the property.
 */
export function createClockButton<T = any>(item: LayerItemDescriptor<T>): LayerButton<T> {
  const isImmediate = (item.data as any)?.animationClock === 'immediate';

  return {
    id: 'clock',
    title: isImmediate
      ? 'Animates on arrival — click to tie to scroll'
      : 'Tied to scroll — click to animate on arrival',
    ariaLabel: 'Toggle animation clock',
    icon: isImmediate ? Vr : Bezier2,
    onclick: ({ item: clicked }) => {
      const data = clicked.data as any;
      if (!data) return;

      if (isImmediate) {
        delete data.animationClock;
        return;
      }
      data.animationClock = 'immediate';
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
