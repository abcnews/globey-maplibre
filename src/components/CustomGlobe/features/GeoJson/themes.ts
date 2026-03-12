export interface GeoJsonTheme {
  color: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  radius: number;
}

export const THEMES: Record<string, GeoJsonTheme> = {
  normal: {
    color: '#00267E',
    strokeWidth: 1,
    fillOpacity: 0.6,
    strokeOpacity: 1.0,
    radius: 6
  },
  highlighted: {
    color: '#FF3C27',
    strokeWidth: 2,
    fillOpacity: 0.6,
    strokeOpacity: 1.0,
    radius: 8
  }
};
