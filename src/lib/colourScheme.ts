/**
 * Shared "normal / highlighted / custom" colour scheme, used anywhere a layer needs a quick
 * on-brand colour choice instead of a raw hex picker. Currently drives GeoJson's `basic`
 * colour mode (`src/components/features/GeoJson/themes.ts`) and the Marker Mode layer colour
 * override (`PropMarkerLayers.svelte`); intended to be reused for CustomLabels colouring later
 * (likely via a CSS class per scheme, rather than a paint-expression colour).
 */

export type ColourSchemeName = 'normal' | 'highlighted' | 'custom';

export const DEFAULT_COLOUR_SCHEME: ColourSchemeName = 'normal';

/** Base colours for the non-custom presets. */
export const COLOUR_SCHEME_COLOURS: Record<Exclude<ColourSchemeName, 'custom'>, string> = {
  normal: '#00267E',
  highlighted: '#FF3C27'
};

/**
 * Resolves a scheme name (+ custom colour) to a hex colour. `undefined` is treated the same
 * as `'custom'`, not `'normal'` — a marker colour override only ever stores a hex with no
 * scheme name at all (see `applyMarkerOverrides`), so an unnamed scheme with a colour present
 * must still use that colour, not silently fall back to normal.
 */
export function resolveSchemeColour(scheme: ColourSchemeName | undefined, customColour?: string): string {
  if (scheme === 'normal' || scheme === 'highlighted') return COLOUR_SCHEME_COLOURS[scheme];
  return customColour || COLOUR_SCHEME_COLOURS.normal;
}

/**
 * Best-effort reverse lookup for UI hydration from a stored hex colour (e.g. a marker
 * override, which only round-trips a raw hex, not which preset produced it): matches a known
 * preset colour case-insensitively, otherwise treats it as custom. No colour at all is
 * `undefined`, distinct from "custom" — callers use that to mean "no override set".
 */
export function schemeForColour(hex: string | undefined): ColourSchemeName | undefined {
  if (!hex) return undefined;
  const normalised = `#${hex.replace(/^#/, '')}`.toLowerCase();
  const preset = (Object.keys(COLOUR_SCHEME_COLOURS) as Array<keyof typeof COLOUR_SCHEME_COLOURS>).find(
    name => COLOUR_SCHEME_COLOURS[name].toLowerCase() === normalised
  );
  return preset ?? 'custom';
}
