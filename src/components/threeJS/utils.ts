export const THREE_URL = 'https://www.abc.net.au/res/sites/news-projects/threejs/0.182.0/three.module.min.js';

let promise: Promise<THREE> | null = null;

export type * from 'three';
import type * as THREE from 'three';
export type { THREE };

/**
 * Load an ES module from a URL and put it on the window.
 * This is useful in non-ESM projects where we want to load a module.
 */
function importModule(url: string): Promise<void> {
  if (window.THREE) return Promise.resolve();

  return new Promise(resolve => {
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import * as THREE from '${url}';
      window.THREE = THREE;
      window.dispatchEvent(new CustomEvent('threejs-loaded'));
    `;

    const onLoaded = () => {
      window.removeEventListener('threejs-loaded', onLoaded);
      resolve();
    };

    window.addEventListener('threejs-loaded', onLoaded);
    document.head.appendChild(script);
  });
}

export async function loadThreeJS(): Promise<THREE> {
  if (promise) return promise;

  promise = (async () => {
    if (window.THREE) return window.THREE as THREE;
    await importModule(THREE_URL);
    return window.THREE as THREE;
  })();

  return promise;
}

declare global {
  interface Window {
    THREE: any;
  }
}
