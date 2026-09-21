/**
 * A short random lowercase-alphanumeric id.
 *
 * Alphanumeric-only matters downstream: Marker Mode addresses an unnamed layer by its id
 * sanitised to `[a-z0-9]` (`layerOverrideKey`), so an id whose uniqueness lived in characters
 * that get stripped would collide with its siblings once encoded.
 */
export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
