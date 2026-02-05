export const THREE_URL = "https://www.abc.net.au/res/sites/news-projects/threejs/0.182.0/three.module.min.js";

let promise: Promise<typeof import('three')> | null = null;

export type * from 'three';
import type * as THREE from 'three';
export type { THREE };


export function loadThreeJS(): Promise<THREE> {
  if (promise) return promise;

  promise = import(/* webpackIgnore: true */ THREE_URL) as any;
  
  return promise!;
}