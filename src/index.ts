import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { selectMounts } from '@abcnews/mount-utils';
import { mount } from 'svelte';
import ScrollytellerGlobe from './components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
import CustomGlobe from './components/CustomGlobe/CustomGlobe.svelte';
import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';
import acto from '@abcnews/alternating-case-to-object';

import { loadGlobeJsonBlobByCmid } from './lib/data/loadBlobByCmid.ts';
import { blobToDecodedObject } from './lib/data/blobAdapter.ts';
import { applyMarkerOverrides } from './lib/data/markerPreview.ts';
import { decodeMarker } from './lib/data/marker.ts';
import { getMountCmid } from './lib/mountCmid.ts';
import { MARKER_NAME } from './lib/constants.ts';

await whenOdysseyLoaded;

// Multiple scrollytellers are allowed in a page, providing they have a unique id.
const mounts = selectMounts('scrollytellerNAME' + MARKER_NAME, {
  markAsUsed: false
});

await Promise.all(
  mounts.map(async mountEl => {
    const scrollyName = acto(mountEl.id || '').name;
    const cmid = getMountCmid(mountEl);

    if (typeof scrollyName !== 'string' || cmid === undefined) {
      return;
    }

    try {
      const jsonBlob = await loadGlobeJsonBlobByCmid(cmid);
      const scrollyConfig = loadScrollyteller<Record<string, any>>(scrollyName, 'u-full', 'mark');

      mount(ScrollytellerGlobe, {
        target: scrollyConfig.mountNode,
        props: {
          jsonBlob,
          panels: scrollyConfig.panels
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
  const cmid = getMountCmid(staticMountEl);

  if (cmid !== undefined) {
    const jsonBlob = await loadGlobeJsonBlobByCmid(cmid);
    const markerConfig = decodeMarker(window.location.hash.slice(1));
    const staticMountProps = applyMarkerOverrides(blobToDecodedObject(jsonBlob), markerConfig);
    mount(CustomGlobe, {
      target: staticMountEl,
      props: { options: staticMountProps, interactive: false, rootElStyle: 'height: 100dvh; width: 100%;' }
    });
  }
}

const [builderMountEl] = selectMounts('builder');

if (builderMountEl) {
  const builderModule = await import('./components/Builder/Builder.svelte');
  mount(builderModule.default, {
    target: builderMountEl
  });
}

// __ADDITIONAL_MOUNTS__
