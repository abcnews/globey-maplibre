import type { maplibregl } from '../../mapLibre/index';

/**
 * Geographic state representing a camera position.
 */
export interface ViewState {
  /** The center point [longitude, latitude]. */
  center: [number, number];
  /** The zoom level. */
  zoom: number;
}

/**
 * Fit mode for bounding box transitions.
 * 'fit' ensures all points are visible.
 * 'fill' ensures the viewport is completely covered by the bounds.
 */
export type FitMode = 'fit' | 'fill';

/**
 * Prop structure for the PanZoomHandler component.
 */
export interface PanZoomProps {
  /** Target center coordinate. */
  coords?: [number, number];
  /** Target bounding box points. */
  bounds?: [number, number][];
  /** Explicit zoom level. */
  z?: number;
  /** Whether to automatically fit the full globe circle. */
  fitGlobe?: boolean;
  /** Whether to enforce boundary constraints (snapping). */
  constrainView?: boolean;
}
