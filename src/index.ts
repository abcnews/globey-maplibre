import { whenOdysseyLoaded } from '@abcnews/env-utils';
import { selectMounts } from '@abcnews/mount-utils';
import { mount } from 'svelte';
import ScrollytellerGlobe from './components/ScrollytellerGlobe/ScrollytellerGlobe.svelte';
import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';
import acto from '@abcnews/alternating-case-to-object';

const MARKER_NAME = 'globey';

await whenOdysseyLoaded;

// Multiple scrollytellers are allowed in a page, providing they have a unique id.
const mounts = selectMounts('scrollytellerNAME' + MARKER_NAME, {
  markAsUsed: false
});

mounts.forEach(mountEl => {
  const scrollyName = acto(mountEl.id || '').name;

  if (typeof scrollyName !== 'string') {
    return;
  }

  try {
    const scrollyConfig = loadScrollyteller(scrollyName, 'u-full', 'mark');

    const panels = scrollyConfig.panels.map(panel => ({
      ...panel,
      data: { ...panel.data, _name: panel.nodes[0]?.textContent || '' }
    }));

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
});

const [builderMountEl] = selectMounts('builder');

if (builderMountEl) {
  const builderModule = await import('./components/Builder/Builder.svelte');
  mount(builderModule.default, {
    target: builderMountEl
  });
}

// __ADDITIONAL_MOUNTS__
