import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { selectMounts } from '@abcnews/mount-utils';
import { mount } from 'svelte';
import ScrollytellerGlobe from './components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';

const MARKER_NAME = 'globey';



const [builderMountEl] = selectMounts('interactivemapbuilder');

if (builderMountEl) {
  const builderModule = await import('./components/Builder/Builder.svelte');

  mount(builderModule.default, {
    target: builderMountEl,
    props: {}
  });
}

const [iframeMountEl] = selectMounts('interactiveglobeyframe');

if (iframeMountEl) {
  const iframeModule = await import('./components/CustomGlobeIframe/CustomGlobeIframe.svelte');

  mount(iframeModule.default, {
    target: iframeMountEl,
    props: {}
  });
}

whenOdysseyLoaded.then(async () => {
  const mounts = selectMounts(MARKER_NAME);
  mounts.forEach(appMountEl => {
    const id = appMountEl.id.match(/\d+$/)?.[0];
    if (mounts.length > 1 && !id) {
      console.error(`IDs must be specified when multiple mounts are used. E.g. #${MARKER_NAME}1`);
      return;
    }

    try {
      const scrollyConfig = loadScrollyteller(MARKER_NAME + (id || ''), 'u-full', 'mark');

      const panels = scrollyConfig.panels.map(panel => ({
        ...panel,
        data: { ...panel.data, _name: panel.nodes[0].textContent }
      }));

      mount(ScrollytellerGlobe, {
        target: scrollyConfig.mountNode,
        props: {
          // FIXME
          // @ts-ignore
          panels
        }
      });
    } catch (e) {
      const errorMessage = 'Unable to load interactive.';
      console.error(errorMessage, e);
      appMountEl.innerHTML = `<p style="border:1px solid red;padding:1rem;">${errorMessage}</p>`;
    }
  });
});

if (process.env.NODE_ENV === 'development') {
  console.debug(`[interactive-globey-maplibre] public path: ${__webpack_public_path__}`);
}
