import acto from '@abcnews/alternating-case-to-object';

/**
 * Reads the source blob's CMID off a CM mount element's id, the same way `index.ts`
 * already reads the scrollyteller name (`acto(mountEl.id).name`) — e.g.
 * `scrollytellerNAMEglobeyCMID106753230` decodes to `{ name: 'globey', cmid: 106753230 }`
 * (acto coerces numeric-looking tokens to numbers itself).
 */
export function getMountCmid(mountEl: { id: string }): number | undefined {
  const { cmid } = acto(mountEl.id || '');
  return typeof cmid === 'number' && Number.isFinite(cmid) ? cmid : undefined;
}
