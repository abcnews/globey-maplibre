import { describe, it, expect } from 'vitest';
import {
  calculateTargetView,
  latLngZoomToViewport,
  viewportToLatLngZoom,
  createZoomInterpolator,
  resolvePanelTargetView,
  resolveAllPanelViews
} from './utils.ts';

describe('calculateTargetView - Aramac Example', () => {
  const aramacBounds: [number, number][] = [
    [145.224844, -22.9602161],
    [145.260066, -22.9602161],
    [145.260066, -22.9808101],
    [145.224844, -22.9808101]
  ];

  const expectedCentre = [145.242455, -22.970513];

  it('calculates correct zoom and centre for iPhone Portrait (390 x 844)', () => {
    const view = calculateTargetView(aramacBounds, 390, 844, 'fill');

    expect(view).not.toBeNull();
    expect(view!.center[0]).toBeCloseTo(expectedCentre[0], 6);
    expect(view!.center[1]).toBeCloseTo(expectedCentre[1], 6);
    expect(view!.zoom).toBeCloseTo(14.692, 2);
  });

  it('calculates correct zoom and centre for iPad Landscape (1024 x 768)', () => {
    const view = calculateTargetView(aramacBounds, 1024, 768, 'fill');
    expect(view).not.toBeNull();
    expect(view!.center[0]).toBeCloseTo(expectedCentre[0], 6);
    expect(view!.center[1]).toBeCloseTo(expectedCentre[1], 6);
    expect(view!.zoom).toBeCloseTo(14.5555, 2);
  });

  it('differs between fit and fill modes', () => {
    const fitView = calculateTargetView(aramacBounds, 1024, 768, 'fit');
    const fillView = calculateTargetView(aramacBounds, 1024, 768, 'fill');

    expect(fillView!.zoom).toBeGreaterThan(fitView!.zoom);
  });
});

describe('Viewport and Zoom Interpolation', () => {
  it('converts lat/lng/zoom to viewport [ux, uy, w] and back accurately', () => {
    const originalCenter: [number, number] = [151.2093, -33.8688]; // Sydney
    const originalZoom = 12;

    const viewport = latLngZoomToViewport(originalCenter, originalZoom);
    const roundTrip = viewportToLatLngZoom(viewport);

    expect(roundTrip.center[0]).toBeCloseTo(originalCenter[0], 5);
    expect(roundTrip.center[1]).toBeCloseTo(originalCenter[1], 5);
    expect(roundTrip.zoom).toBeCloseTo(originalZoom, 5);
  });

  it('interpolates between two distinct views smoothly using Van Wijk & Nuij algorithm', () => {
    const sydney = { center: [151.2093, -33.8688] as [number, number], zoom: 12 };
    const london = { center: [-0.1278, 51.5074] as [number, number], zoom: 14 };

    const interpolate = createZoomInterpolator(sydney, london);

    const start = interpolate(0);
    expect(start.center[0]).toBeCloseTo(sydney.center[0], 4);
    expect(start.center[1]).toBeCloseTo(sydney.center[1], 4);
    expect(start.zoom).toBeCloseTo(sydney.zoom, 4);

    const end = interpolate(1);
    expect(end.center[0]).toBeCloseTo(london.center[0], 4);
    expect(end.center[1]).toBeCloseTo(london.center[1], 4);
    expect(end.zoom).toBeCloseTo(london.zoom, 4);

    // Midpoint should zoom out significantly for long-distance transition
    const mid = interpolate(0.5);
    expect(mid.zoom).toBeLessThan(sydney.zoom);
    expect(mid.zoom).toBeLessThan(london.zoom);
  });

  it('handles antimeridian wrapping correctly', () => {
    const fiji = { center: [178.065, -17.7134] as [number, number], zoom: 8 };
    const samoa = { center: [-172.1046, -13.759] as [number, number], zoom: 8 };

    const interpolate = createZoomInterpolator(fiji, samoa);
    const mid = interpolate(0.5);

    // Should travel east across the antimeridian (~180°/-180°), NOT west around the entire planet (which would be near longitude 0)
    // Longitude should be near 180 / -180
    const lng = mid.center[0];
    const isNearAntimeridian = Math.abs(lng) > 170;
    expect(isNearAntimeridian).toBe(true);
  });
});

describe('Target View Inheritance', () => {
  const mockMap = {
    getCenter: () => ({ lng: 0, lat: 0 }),
    getZoom: () => 1,
    getContainer: () => ({ clientWidth: 1000, clientHeight: 800 })
  } as any;

  it('inherits previous good view state when panel lacks geographic coordinates', () => {
    const previousView = { center: [151.2093, -33.8688] as [number, number], zoom: 10 };
    const emptyPanelData = {};

    const resolved = resolvePanelTargetView(mockMap, emptyPanelData, 'fit', previousView);
    expect(resolved.center[0]).toBeCloseTo(151.2093, 4);
    expect(resolved.center[1]).toBeCloseTo(-33.8688, 4);
    expect(resolved.zoom).toBe(10);
  });

  it('allows overriding zoom while inheriting center coordinates', () => {
    const previousView = { center: [151.2093, -33.8688] as [number, number], zoom: 10 };
    const zoomOnlyPanelData = { z: 14 };

    const resolved = resolvePanelTargetView(mockMap, zoomOnlyPanelData, 'fit', previousView);
    expect(resolved.center[0]).toBeCloseTo(151.2093, 4);
    expect(resolved.center[1]).toBeCloseTo(-33.8688, 4);
    expect(resolved.zoom).toBe(14);
  });

  it('sequentially resolves panel views with forward inheritance', () => {
    const panel = (map: Record<string, unknown>) => ({ data: { map } }) as any;
    const panels = [
      panel({ coords: [151.2093, -33.8688], z: 10 }), // Panel 0: Sydney
      panel({}), // Panel 1: narrative step without map — should inherit Sydney
      panel({ z: 12 }), // Panel 2: should inherit Sydney centre + zoom 12
      panel({ coords: [-0.1278, 51.5074], z: 8 }) // Panel 3: London
    ];

    const views = resolveAllPanelViews(mockMap, panels);

    expect(views).toHaveLength(4);

    // Panel 0: Sydney
    expect(views[0].center[0]).toBeCloseTo(151.2093, 4);
    expect(views[0].zoom).toBe(10);

    // Panel 1: Inherits Sydney
    expect(views[1].center[0]).toBeCloseTo(151.2093, 4);
    expect(views[1].zoom).toBe(10);

    // Panel 2: Inherits Sydney center, custom zoom 12
    expect(views[2].center[0]).toBeCloseTo(151.2093, 4);
    expect(views[2].zoom).toBe(12);

    // Panel 3: London
    expect(views[3].center[0]).toBeCloseTo(-0.1278, 4);
    expect(views[3].zoom).toBe(8);
  });
});
