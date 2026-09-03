export interface ViewState {
  center: [number, number];
  zoom: number;
}

/** Van Wijk & Nuij viewport state: [ux, uy, w] */
export type ZoomPoint = [number, number, number];

export type FitMode = 'fit' | 'fill';

export interface PanZoomProps {
  coords?: [number, number];
  bounds?: [number, number][];
  z?: number;
  fitGlobe?: boolean;
  constrainView?: boolean;
  animationDuration?: number;
}
