<script lang="ts">
  import favicon from './favicon.svg';
  import faviconLocal from './favicon-local.svg';

  /**
   * Swaps in a colourised gradient globe icon for the builder tab (cyan/blue on
   * production, orange/magenta locally) so it's distinguishable from the plain
   * site favicon when several builder tabs are open. Ported from Builder.legacy/Favicon.
   */
  const isProduction = typeof window !== 'undefined' && window.location.hostname === 'www.abc.net.au';
  const faviconUrl = isProduction ? favicon : faviconLocal;
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={faviconUrl} />
</svelte:head>
