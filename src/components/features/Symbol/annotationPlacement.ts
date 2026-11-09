import type { AnnotationAnchor } from '../../../lib/data/jsonBlob.ts';
import type { Extents } from '../../../lib/symbolImage.ts';

/**
 * How far to move an annotation, in px as `[right, down]`, so it clears the symbol.
 *
 * The label's `anchor` point sits on the map coordinate, so the label spreads away from it. It is
 * pushed off the coordinate by the symbol's reach on that side only: a `bottom-left` label sits up
 * and to the right, so it moves up by the symbol's reach above the coordinate and right by its
 * reach to the right. A pin reaches far up but only half its width sideways, so one shared offset
 * would leave the label too far from it. An axis the anchor centres on isn't moved.
 */
export function annotationShift(anchor: AnnotationAnchor, extents: Extents): [number, number] {
  const right = anchor.includes('left') ? extents.right : anchor.includes('right') ? -extents.left : 0;
  const down = anchor.includes('top') ? extents.down : anchor.includes('bottom') ? -extents.up : 0;
  return [right, down];
}
