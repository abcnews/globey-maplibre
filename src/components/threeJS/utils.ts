export const THREE_URL = "https://www.abc.net.au/res/sites/news-projects/threejs/0.158.0/three.module.min.js";

let promise: Promise<any> | null = null;

export function loadThreeJS(): Promise<any> {
  if (promise) return promise;

  promise = import(/* webpackIgnore: true */ THREE_URL);
  
  return promise;
}
