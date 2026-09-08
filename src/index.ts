import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { selectMounts } from '@abcnews/mount-utils';
import { mount } from 'svelte';
import ScrollytellerGlobe from './components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
import CustomGlobe from './components/CustomGlobe/CustomGlobe.svelte';
import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';
import acto from '@abcnews/alternating-case-to-object';

import { markerSchema } from './lib/marker';
import { glog } from './lib/tweenDebug.ts';

const MARKER_NAME = 'globey';

glog('index', 'module evaluated, waiting for Odyssey');
await whenOdysseyLoaded;
glog('index', 'Odyssey loaded');

// Multiple scrollytellers are allowed in a page, providing they have a unique id.
const mounts = selectMounts('scrollytellerNAME' + MARKER_NAME, {
  markAsUsed: false
});
glog('index', `found ${mounts.length} scrollyteller mount(s)`, mounts.map(m => m.id));

await Promise.all(
  mounts.map(async mountEl => {
    const scrollyName = acto(mountEl.id || '').name;

    if (typeof scrollyName !== 'string') {
      return;
    }

    try {
      const scrollyConfig = loadScrollyteller(scrollyName, 'u-full', 'mark');
      glog('index', `loadScrollyteller("${scrollyName}") -> ${scrollyConfig.panels.length} raw panel(s)`, {
        mountNode: scrollyConfig.mountNode,
        firstPanelNodes: scrollyConfig.panels[0]?.nodes?.length ?? 0
      });

      const panels = await Promise.all(
        scrollyConfig.panels.map(async panel => ({
          ...panel,
          data: {
            ...(await markerSchema.decode(panel.data)),
            _name: panel.nodes[0]?.textContent || ''
          }
        }))
      );
      glog('index', `decoded ${panels.length} panel(s)`, {
        names: panels.map(p => p.data._name),
        bases: panels.map(p => p.data.base)
      });
      if (panels.length === 0) {
        glog('index', 'NO PANELS — ScrollytellerGlobe will render nothing (options undefined)');
      }
      console.log('mounting', scrollyConfig.mountNode);

      mount(ScrollytellerGlobe, {
        target: scrollyConfig.mountNode,
        props: {
          panels
        }
      });
      glog('index', 'ScrollytellerGlobe mounted');
    } catch (e) {
      const errorMessage = 'Unable to load interactive.';
      console.error(errorMessage, e);
      glog('index', 'loadScrollyteller / mount threw', e);
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
