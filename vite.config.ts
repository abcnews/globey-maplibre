import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * Vite plugin to export a CoreMedia-compatible non-module entrypoint to
 * bootstrap the rest of the app as type="module".
 */
const coremediaPlugin = (): Plugin => {
	const getProxyScript = (entryPath: string) => `(function() {
  var src = document.currentScript ? document.currentScript.src : '';
  var base = src.substring(0, src.lastIndexOf('/') + 1);
  var script = document.createElement('script');
  script.type = 'module';
  script.src = base + '${entryPath}';
  document.head.appendChild(script);
})();`;

	return {
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
				this.emitFile({
					type: 'asset',
					fileName: 'coremedia.js',
					source: getProxyScript(entry.fileName)
				});
			}
		},
		configureServer(server) {
			server.middlewares.use((req: any, res, next) => {
				if (req.url === '/coremedia.js') {
					res.setHeader('Content-Type', 'application/javascript');
					res.end(getProxyScript('src/coremedia.ts'));
					return;
				}
				next();
			});
		}
	};
};

export default defineConfig({
	plugins: [sveltekit(), coremediaPlugin()]
});
