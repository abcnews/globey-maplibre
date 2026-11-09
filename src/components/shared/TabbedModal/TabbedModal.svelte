<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export interface ModalTab {
    /** Unique id, used as the bound `activeId`. */
    id: string;
    /** Text on the tab button. */
    label: string;
    /** The panel shown while this tab is active. */
    content: Snippet;
  }
</script>

<script lang="ts">
  import { Modal, Tabs } from '@abcnews/components-builder';

  interface Props {
    /** The tabs, in order. */
    tabs: ModalTab[];
    /** The open tab's id. Defaults to the first tab. */
    activeId?: string;
    /** Called when the modal asks to close (the close button or the backdrop). */
    onClose?: () => void;
    /** Which side of the screen the modal sits on, as `Modal`'s `position`. */
    position?: string;
    /** CSS minimum width of the body, so the modal doesn't resize between tabs. */
    minWidth?: string;
    /** CSS minimum height of the body, so the modal doesn't resize between tabs. */
    minHeight?: string;
    /** Buttons for the footer. No footer is drawn without it. */
    footer?: Snippet;
  }

  let { tabs, activeId = $bindable(), onClose, position, minWidth, minHeight, footer }: Props = $props();

  // `Tabs` draws only the tab buttons when no item has `content`; the panel is drawn below, in the modal's body.
  const tabButtons = $derived(tabs.map(({ id, label }) => ({ id, label })));
  const activeTab = $derived(tabs.find(({ id }) => id === activeId) ?? tabs[0]);
</script>

<!--
  `Modal` only draws its title bar (and close button) when `title` is truthy, so a single space gives an
  empty title. The tabs go in the bar's icon slot, in place of the title text.
-->
<Modal title=" " {position} {onClose} footerChildren={footer}>
  {#snippet titleIcon()}
    <Tabs class="tabbed-modal-tabs" items={tabButtons} bind:activeId />
  {/snippet}

  <div class="tabbed-modal-body" style:min-width={minWidth} style:min-height={minHeight}>
    {#if activeTab}
      {@render activeTab.content()}
    {/if}
  </div>
</Modal>

<style>
  .tabbed-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* `Modal` caps its body at 50vh, which would cut a minimum height short and scroll the content. */
  :global(.modal-content:has(> .tabbed-modal-body)) {
    max-height: 85vh;
  }

  /*
   * The tabs sit in the title bar. The bar loses its bottom padding so the tabs rest on its bottom border,
   * and the active tab (which paints over 1px of that border) opens into the body below. The tab list's own
   * baseline line is hidden, since the bar's border already draws it.
   * `dialog.modal` raises the specificity above `Modal`'s own scoped `.modal-title` rules, which otherwise win a tie.
   */
  :global(dialog.modal .modal-title:has(.tabbed-modal-tabs)) {
    align-items: flex-end;
    padding-bottom: 0;
  }

  :global(dialog.modal .modal-title:has(.tabbed-modal-tabs) .modal-title-icon) {
    align-self: flex-end;
    align-items: flex-end;
    /* 1px lower, so the tabs sit over the bar's bottom border. */
    margin-bottom: -1px;
  }

  /* The close button keeps its own vertical centring against the bar's height. */
  :global(dialog.modal .modal-title:has(.tabbed-modal-tabs) .modal-close) {
    align-self: center;
    margin-bottom: 0.25rem;
  }

  :global(.tabbed-modal-tabs .components-builder-tabs-filler),
  :global(.tabbed-modal-tabs .components-builder-tabs-border-line) {
    display: none;
  }
</style>
