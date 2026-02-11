<script lang="ts">
	import favicon from './favicon.svg';
	import faviconLocal from './favicon-local.svg';

	const isProduction =
		typeof window !== 'undefined' && window.location.hostname === 'www.abc.net.au';
	const faviconUrl = isProduction ? favicon : faviconLocal;
	console.log({ faviconUrl });
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={faviconUrl} />
</svelte:head>
