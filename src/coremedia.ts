import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { getMountValue, selectMounts } from '@abcnews/mount-utils';
import { mount } from 'svelte';
import ScrollytellerGlobe from './components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';
import acto from '@abcnews/alternating-case-to-object';

const MARKER_NAME = 'globey';

whenOdysseyLoaded.then(async () => {
  const mounts = selectMounts('scrollytellerNAME' + MARKER_NAME, { markAsUsed: false });
  mounts.forEach(mountEl => {
    const scrollyMountValue = getMountValue(mountEl, 'scrollytellerNAME');
    const scrollyName = acto(scrollyMountValue).name;

    if (typeof scrollyName !== 'string') {
      return;
    }

    try {
      const scrollyConfig = loadScrollyteller(scrollyName, 'u-full', 'mark');

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
      mountEl.innerHTML = `<p style="border:1px solid red;padding:1rem;">${errorMessage}</p>`;
    }
  });
});
