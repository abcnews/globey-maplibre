declare module 'd3-interpolate' {
  export function interpolateZoom(
    a: [number, number, number],
    b: [number, number, number]
  ): {
    (t: number): [number, number, number];
    duration: number;
  };
}

declare module '@abcnews/aunty/vite' {
  import type { Plugin } from 'vite';
  export function abcCorsPlugin(): Plugin;
  export function es5EntryPlugin(): Plugin;
  export function getServer(): any;
}
