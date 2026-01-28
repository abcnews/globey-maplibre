import type { GeoJsonConfig } from '../../../../lib/marker';

export function getColorExpression(config: GeoJsonConfig, type: 'fill' | 'line' | 'circle'): any {
  if (config.colorMode === 'override') {
    return config.colorConfig?.override || '#ff0000';
  }
  
  if (config.colorMode === 'simple') {
    return ['coalesce', ['get', 'fill'], ['get', 'fill-color'], ['get', 'marker-color'], '#888888'];
  }

  if (config.colorMode === 'scale' && config.colorProp) {
    const min = config.colorConfig?.min ?? 0;
    const max = config.colorConfig?.max ?? 100;
    const minColor = config.colorConfig?.minColor || '#ffffff';
    const maxColor = config.colorConfig?.maxColor || '#ff0000';
    
    return [
      'interpolate',
      ['linear'],
      ['get', config.colorProp],
      min, minColor,
      max, maxColor
    ];
  }

  if (config.colorMode === 'class') {
      const prop = config.colorProp || 'class';
      return [
          'match',
          ['get', prop],
          'primary', '#1f77b4',
          'secondary', '#ff7f0e',
          'tertiary', '#2ca02c',
          '#888888'
      ];
  }
  
  return '#888888';
}

export function getOpacityExpression(config: GeoJsonConfig): any {
    if (config.filter?.prop && config.filter.values) {
        return [
            'case',
            ['in', ['get', config.filter.prop], ['literal', config.filter.values]],
            1,
            0
        ];
    }
    return 1;
}

// JS Evaluation for Points/Spikes

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

function interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const result = c1.map((c, i) => Math.round(c + factor * (c2[i] - c)));
    return `rgb(${result.join(',')})`;
}

export function evaluateColor(config: GeoJsonConfig, feature: any): string {
    const props = feature.properties || {};

    if (config.colorMode === 'override') {
        return config.colorConfig?.override || '#ff0000';
    }
    
    if (config.colorMode === 'simple') {
        return props['marker-color'] || props['fill'] || props['fill-color'] || '#888888';
    }

    if (config.colorMode === 'scale' && config.colorProp) {
        const val = Number(props[config.colorProp]);
        if (isNaN(val)) return '#888888';

        const min = config.colorConfig?.min ?? 0;
        const max = config.colorConfig?.max ?? 100;
        const minColor = config.colorConfig?.minColor || '#ffffff';
        const maxColor = config.colorConfig?.maxColor || '#ff0000';

        if (val <= min) return minColor;
        if (val >= max) return maxColor;
        
        const factor = (val - min) / (max - min);
        return interpolateColor(minColor, maxColor, factor);
    }
    
    if (config.colorMode === 'class') {
         const prop = config.colorProp || 'class';
         const val = props[prop];
         if (val === 'primary') return '#1f77b4';
         if (val === 'secondary') return '#ff7f0e'; // TODO: make configurable
         if (val === 'tertiary') return '#2ca02c';
         return '#888888';
    }

    return '#888888';
}

export function evaluateOpacity(config: GeoJsonConfig, feature: any): number {
    if (config.filter?.prop && config.filter.values) {
        const val = String(feature.properties?.[config.filter.prop]);
        // Filter values are the allowed list?
        if (!config.filter.values.includes(val)) {
            return 0;
        }
    }
    return 1;
}

export function evaluateHeight(config: GeoJsonConfig, feature: any): number {
    if (!config.spike?.heightProp) return 0;
    const val = Number(feature.properties?.[config.spike.heightProp]);
    if (isNaN(val)) return 0;
    const scalar = config.spike.scalar ?? 1;
    return val * scalar;
}
