import type { Label, LabelStyle } from '../../../lib/marker';

/** One resolved custom-label feature for a given point in the tween. */
export interface LabelFeatureState {
  name: string;
  style: LabelStyle;
  coords: [number, number];
  /** 0..1, fed to the layer's `text-opacity` via a per-feature `opacity` property. */
  opacity: number;
}

/** Index labels by name, dropping entries with no name or no coordinates. */
function byName(labels: Label[]): Map<string, Label> {
  return new Map(
    labels.filter(label => Boolean(label?.name) && Boolean(label?.coords)).map(label => [label.name, label])
  );
}

/**
 * Resolves the visible custom-label set for a tween between two panels, keyed by
 * `name`.
 *
 * A name present in both panels is *persistent*: it holds the outgoing panel's
 * position and style at full opacity, then snaps to the incoming values when the
 * panel boundary is crossed (only opacity animates, by design). A name only in
 * the outgoing panel fades out; a name only in the incoming panel fades in. The
 * two overlap for the whole transition (full cross-fade).
 *
 * Duplicate names within a single panel collide — the last one wins.
 */
export function resolveLabelTransition(
  fromLabels: Label[] = [],
  toLabels: Label[] = [],
  easedT: number
): LabelFeatureState[] {
  const from = byName(fromLabels);
  const to = byName(toLabels);
  const names = [...new Set([...from.keys(), ...to.keys()])];

  return names.flatMap(name => {
    const outgoing = from.get(name);
    const incoming = to.get(name);

    if (outgoing && incoming) {
      return [{ name, style: outgoing.style, coords: outgoing.coords, opacity: 1 }];
    }
    if (outgoing) {
      return [{ name, style: outgoing.style, coords: outgoing.coords, opacity: 1 - easedT }];
    }
    if (incoming) {
      return [{ name, style: incoming.style, coords: incoming.coords, opacity: easedT }];
    }
    return [];
  });
}
