import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { selectMounts } from '@abcnews/mount-utils';
import { mount } from 'svelte';
import ScrollytellerGlobe from './components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
import CustomGlobe from './components/CustomGlobe/CustomGlobe.svelte';
import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';
import acto from '@abcnews/alternating-case-to-object';

import { markerSchema } from './lib/marker';

const MARKER_NAME = 'globey';

await whenOdysseyLoaded;

// Multiple scrollytellers are allowed in a page, providing they have a unique id.
const mounts = selectMounts('scrollytellerNAME' + MARKER_NAME, {
  markAsUsed: false
});

await Promise.all(
  mounts.map(async mountEl => {
    const scrollyName = acto(mountEl.id || '').name;

    if (typeof scrollyName !== 'string') {
      return;
    }

    try {
      const scrollyConfig = loadScrollyteller(scrollyName, 'u-full', 'mark');

      const panels = await Promise.all(
        scrollyConfig.panels.map(async panel => ({
          ...panel,
          data: {
            ...(await markerSchema.decode(panel.data)),
            _name: panel.nodes[0]?.textContent || ''
          }
        }))
      );
      console.log('mounting', scrollyConfig.mountNode);

      mount(ScrollytellerGlobe, {
        target: scrollyConfig.mountNode,
        props: {
          panels
        }
      });
    } catch (e) {
      const errorMessage = 'Unable to load interactive.';
      console.error(errorMessage, e);
      mountEl.innerHTML = `<p style="border:1px solid red;padding:1rem;">${errorMessage}</p>`;
    }
  })
);

const [staticMountEl] = selectMounts('staticglobey');

if (staticMountEl) {
  const staticMountProps = await markerSchema.decode(acto(window.location.hash.slice(1)));
  mount(CustomGlobe, {
    target: staticMountEl,
    props: { options: staticMountProps, rootElStyle: 'height: 100dvh; width: 100%;' }
  });
}

const [builderMountEl] = selectMounts('builder');

if (builderMountEl) {
  const builderModule = await import('./components/Builder/Builder.svelte');
  mount(builderModule.default, {
    target: builderMountEl
  });
}

// __ADDITIONAL_MOUNTS__
