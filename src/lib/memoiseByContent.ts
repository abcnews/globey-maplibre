/**
 * Returns a function that hands back the *previous* value whenever the new one
 * has identical content, so object identity survives a content-identical rebuild.
 *
 * Svelte's `$derived` propagates on identity, not content. That is usually what
 * you want, but two things in this project routinely rebuild equal objects: the
 * builder deep-clones `options` on every map move (`$state.snapshot`), and every
 * `$derived` that maps over panels allocates fresh arrays. Downstream that reads
 * as "this changed", and a map handler whose `$effect` rebuilds its MapLibre
 * layers will tear them down and re-add them — a visible flash — for a config
 * that did not actually change.
 *
 * Wrapping the derived in one of these makes the propagation content-based, so
 * handlers rebuild on real edits only. Comparison is by `JSON.stringify`, so it
 * suits plain serialisable config; don't use it for values holding functions,
 * class instances or cyclic references.
 */
export function memoiseByContent<T>(): (value: T) => T {
  let previousJson: string | undefined;
  let previousValue: T;

  return (value: T): T => {
    const json = JSON.stringify(value);
    if (json === previousJson) return previousValue;

    previousJson = json;
    previousValue = value;
    return value;
  };
}
