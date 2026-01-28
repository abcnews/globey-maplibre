import type { GeoJsonConfig } from '../../../../lib/marker';

export function generateId(url: string): string {
  if (!url) return 'none';
  // Simple hash for stable IDs
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `gj-${Math.abs(hash).toString(36)}`;
}

export function getColorExpression(config: GeoJsonConfig, context: 'fill' | 'stroke' | 'marker'): any {
  if (config.colorMode === 'override') {
    return config.colorConfig?.override || '#ff0000';
  }
  
  if (config.colorMode === 'simple') {
    if (context === 'stroke') {
        return ['coalesce', ['get', 'stroke'], '#555555'];
    }
    if (context === 'marker') {
        return ['coalesce', ['get', 'marker-color'], ['get', 'stroke'], ['get', 'fill'], ['get', 'fill-color'], '#7e7e7e'];
    }
    return ['coalesce', ['get', 'fill'], ['get', 'fill-color'], '#555555'];
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

export function getStrokeWidthExpression(config: GeoJsonConfig): any {
    if (config.colorMode === 'simple') {
        return ['coalesce', ['get', 'stroke-width'], 2];
    }
    return 2;
}

export function getCircleRadiusExpression(config: GeoJsonConfig): any {
    if (config.colorMode === 'simple') {
        return [
            'match',
            ['get', 'marker-size'],
            'small', 4,
            'large', 9,
            ['coalesce', ['to-number', ['get', 'marker-size']], 6]
        ];
    }
    return 6;
}

export function getCircleOpacityExpression(config: GeoJsonConfig): any {
    const baseOpacity = getOpacityExpression(config);
    if (config.colorMode === 'simple') {
        return ['*', baseOpacity, ['coalesce', ['get', 'opacity'], ['get', 'fill-opacity'], ['get', 'stroke-opacity'], 1.0]];
    }
    return baseOpacity;
}

export function getFillOpacityExpression(config: GeoJsonConfig): any {
    const baseOpacity = getOpacityExpression(config);
    if (config.colorMode === 'simple') {
        return ['*', baseOpacity, ['coalesce', ['get', 'fill-opacity'], 0.5]];
    }
    return baseOpacity === 1 ? 0.5 : baseOpacity; // Default to 0.5 for areas unless filtered
}

export function getStrokeOpacityExpression(config: GeoJsonConfig): any {
    const baseOpacity = getOpacityExpression(config);
    if (config.colorMode === 'simple') {
        return ['*', baseOpacity, ['coalesce', ['get', 'stroke-opacity'], 1.0]];
    }
    return baseOpacity;
}

export function getOpacityExpression(config: GeoJsonConfig): any {
    if (config.filter?.prop && config.filter.values) {
        return [
            'case',
            ['in', ['to-string', ['get', config.filter.prop]], ['literal', config.filter.values]],
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
        return props['marker-color'] || props['stroke'] || props['fill'] || props['fill-color'] || '#888888';
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
    const props = feature.properties || {};
    let opacity = 1;

    if (config.filter?.prop && config.filter.values) {
        const val = String(props[config.filter.prop]);
        if (!config.filter.values.includes(val)) {
            opacity = 0;
        }
    }

    if (opacity > 0 && config.colorMode === 'simple') {
        const simpleOpacity = props['stroke-opacity'] ?? props['fill-opacity'] ?? props['opacity'] ?? 1;
        opacity *= Number(simpleOpacity);
    }

    return opacity;
}

export function evaluateSymbol(config: GeoJsonConfig, feature: any): string {
    if (config.colorMode !== 'simple') return '';
    const symbol = feature.properties?.['marker-symbol'];
    if (!symbol) return '';
    // Spec says: "a single digit 0-9 or an ID from the Maki icon set"
    // For now we just return the string and RenderPoint can decide how to show it
    return String(symbol);
}

export function evaluateHeight(config: GeoJsonConfig, feature: any): number {
    if (!config.spike?.heightProp) return 0;
    const val = Number(feature.properties?.[config.spike.heightProp]);
    if (isNaN(val)) return 0;
    const scalar = config.spike.scalar ?? 1;
    return val * scalar;
}
