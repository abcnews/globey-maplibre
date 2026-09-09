import { describe, it, expect } from 'vitest';
import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
import type { DecodedObject } from '../../../lib/marker';
import { TweenController } from './TweenController.svelte.ts';

const makePanels = (): PanelDefinition<DecodedObject>[] =>
  [
    { nodes: [], data: { geoJson: [{ id: 'a', type: 'lines' }] } },
    { nodes: [], data: { geoJson: [{ id: 'a', type: 'lines' }] } }
  ] as unknown as PanelDefinition<DecodedObject>[];

describe('TweenController.sync', () => {
  // `sync()` runs on every scroll tick. If `#panels` were a deep `$state`, each
  // assignment would re-proxy the same raw array into a new object, invalidating
  // every `tween.panels` reader 60×/sec — which rebuilt GeoJSON map layers on
  // every frame and made them flash.
  it('keeps panel identity stable when re-synced with the same array', () => {
    const controller = new TweenController();
    const panels = makePanels();
    const input = { panels, currentPanel: 0, virtualPanel: 0, panelPct: 0, isTouch: false };

    controller.sync(input);
    const firstPanels = controller.panels;
    const firstConfig = controller.panels[0].data.geoJson;

    controller.sync({ ...input, panelPct: 0.5 });

    expect(controller.panels).toBe(firstPanels);
    expect(controller.panels[0].data.geoJson).toBe(firstConfig);
  });

  it('picks up a genuinely new panel array', () => {
    const controller = new TweenController();
    const input = { currentPanel: 0, virtualPanel: 0, panelPct: 0, isTouch: false };

    controller.sync({ ...input, panels: makePanels() });
    const firstPanels = controller.panels;

    controller.sync({ ...input, panels: makePanels() });

    expect(controller.panels).not.toBe(firstPanels);
    expect(controller.panelCount).toBe(2);
  });
});
