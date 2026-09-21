import { loadScrollyteller } from '@abcnews/svelte-scrollyteller';
import acto from '@abcnews/alternating-case-to-object';
import type { ScrollytellerDefinition } from '@abcnews/svelte-scrollyteller';

/**
 * Converts a marker text string (e.g. #mark...) into an Odyssey mount element
 */
function mountTextToMountEl(mountText: string): HTMLElement {
  const mountEl = document.createElement('div');
  mountEl.setAttribute('data-mount', '');
  mountEl.setAttribute('data-component', 'Anchor');
  mountEl.setAttribute('id', mountText.replace(/^#/, ''));
  return mountEl;
}

interface ParseOptions {
  text: string;
  name?: string;
  markerName?: string;
  className?: string;
}

/**
 * Parses raw pasted plain text or HTML containing scrollyteller marks and text
 * into a ScrollytellerDefinition.
 */
export function parsePastedContent({
  text,
  name = 'globey',
  markerName = 'mark',
  className = 'u-full'
}: ParseOptions): ScrollytellerDefinition {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('Please paste scrollyteller content first.');
  }

  let elements: HTMLElement[] = [];
  const isHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  if (isHtml) {
    const dom = new DOMParser().parseFromString(trimmed, 'text/html');
    const body = dom.body;
    body.querySelectorAll('*').forEach(el => {
      if (!el.hasAttribute('data-mount')) {
        el.removeAttribute('class');
        el.removeAttribute('id');
      }
    });
    elements = Array.from(body.children) as HTMLElement[];
  } else {
    const rawLines = trimmed
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    elements = rawLines.map(line => {
      if (line.startsWith('#')) {
        return mountTextToMountEl(line);
      }
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    });
  }

  type ReducerState = {
    hasBegun: boolean;
    hasEnded: boolean;
    isRemoving: boolean;
    scrollytellingEls: HTMLElement[];
  };

  const { scrollytellingEls } = elements.reduce<ReducerState>(
    (memo, el) => {
      if (memo.hasEnded) {
        return memo;
      }

      const content = (el.textContent || '').trim();

      if (content.indexOf('#remove') === 0) {
        memo.isRemoving = true;
      } else if (content.indexOf('#endremove') === 0) {
        memo.isRemoving = false;
      } else if (content.indexOf('#') === 0 || el.hasAttribute('data-mount')) {
        const id = el.id ? `#${el.id}` : content;
        if (id.indexOf(`#scrollyteller${name ? `NAME${name}` : ''}`) === 0 && !memo.hasBegun) {
          memo.hasBegun = true;
        } else if (id.indexOf('#endscrollyteller') === 0) {
          memo.hasEnded = true;
        }
        memo.scrollytellingEls.push(el.hasAttribute('data-mount') ? el : mountTextToMountEl(id));
      } else if (!memo.hasBegun || memo.isRemoving || content === '') {
        // Skip content outside scrollyteller or marked for removal
      } else {
        memo.scrollytellingEls.push(el);
      }
      return memo;
    },
    {
      hasBegun: false,
      hasEnded: false,
      isRemoving: false,
      scrollytellingEls: []
    }
  );

  if (scrollytellingEls.length === 0) {
    throw new Error(
      `No scrollyteller found. Please ensure your text includes #scrollytellerNAME${name}... and #endscrollyteller.`
    );
  }

  const container = document.createElement('div');
  scrollytellingEls.forEach(el => container.appendChild(el));
  document.body.appendChild(container);

  // Extract scrollyteller name from the opener tag if present
  const openerEl = scrollytellingEls.find(el => el.id && el.id.startsWith('scrollyteller'));
  const scrollyName = openerEl ? acto(openerEl.id).name || name : name;

  const scrollytellerDefinition = loadScrollyteller(String(scrollyName), className, markerName);
  document.body.removeChild(container);

  return scrollytellerDefinition;
}
