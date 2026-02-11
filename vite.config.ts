import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * Vite plugin to export a CoreMedia-compatible non-module entrypoint to
 * bootstrap the rest of the app as type="module".
 */
const coremediaPlugin = (): Plugin => ({
	name: 'coremedia-proxy',
	buildStart() {
		this.emitFile({
			type: 'chunk',
			id: 'src/coremedia.ts',
			name: 'coremedia'
		});
	},
	generateBundle(options, bundle) {
		const entry = Object.values(bundle).find(
			(chunk) => chunk.type === 'chunk' && chunk.name === 'coremedia'
		);
		if (entry && 'fileName' in entry) {
			const scriptSource = `(function() {
  var src = document.currentScript ? document.currentScript.src : '';
  var base = src.substring(0, src.lastIndexOf('/') + 1);
  var script = document.createElement('script');
  script.type = 'module';
  script.src = base + '${entry.fileName}';
  document.head.appendChild(script);
})();`;
			this.emitFile({
				type: 'asset',
				fileName: 'coremedia.js',
				source: scriptSource
			});
		}
	}
});

export default defineConfig({
	plugins: [sveltekit(), coremediaPlugin()]
});
