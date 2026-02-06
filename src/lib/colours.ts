export function parseColor(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }
  return [128, 128, 128]; // Default grey
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

export function interpolateColour(colour1: string, colour2: string, factor: number): string {
  const c1 = parseColor(colour1);
  const c2 = parseColor(colour2);
  const result = c1.map((c, i) => Math.round(c + factor * (c2[i] - c)));
  return `rgb(${result.join(',')})`;
}

/**
 * Creates an interpolator function for a list of colours.
 */
export function getCustomPaletteInterpolator(colours: string[]) {
  return (t: number) => {
    if (!colours || colours.length === 0) return '#888888';
    if (colours.length === 1) return colours[0];
    const n = colours.length - 1;
    const i = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
    const segmentT = t * n - i;
    return interpolateColour(colours[i], colours[i + 1], segmentT);
  };
}
