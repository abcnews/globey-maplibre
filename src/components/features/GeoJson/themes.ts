import { COLOUR_SCHEME_COLOURS } from '../../../lib/colourScheme.ts';

export interface GeoJsonTheme {
  color: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  radius: number;
}

/** GeoJson-specific visual presets, layered on top of the shared normal/highlighted colours. */
export const THEMES: Record<'normal' | 'highlighted', GeoJsonTheme> = {
  normal: {
    color: COLOUR_SCHEME_COLOURS.normal,
    strokeWidth: 1,
    fillOpacity: 0.6,
    strokeOpacity: 1.0,
    radius: 6
  },
  highlighted: {
    color: COLOUR_SCHEME_COLOURS.highlighted,
    strokeWidth: 2,
    fillOpacity: 0.6,
    strokeOpacity: 1.0,
    radius: 8
  }
};
