import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, hostname } from 'node:os';

/**
 * Get server configuration for development.
 * Falls back to HTTP if SSL certificates are not found in the aunty directory.
 * @returns {import('vite').CommonServerOptions}
 */
const getServer = () => {
	const HOME_DIR = homedir();
	const SSL_DIR = join(HOME_DIR, '.aunty/ssl');
	const INTERNAL_SUFFIX = '.aus.aunty.abc.net.au';

	// Determine host - check command line args first, then environment, then default
	const hostArg = process.argv.find((arg: string) => arg.startsWith('--host='));
	const host = hostArg
		? hostArg.split('=')[1]
		: process.env.AUNTY_HOST || `${hostname().toLowerCase().split('.')[0]}${INTERNAL_SUFFIX}`;

	const certDir = join(SSL_DIR, host);
	const certFile = join(certDir, 'server.crt');
	const keyFile = join(certDir, 'server.key');

	// Use certs if they exist
	const https =
		existsSync(certFile) && existsSync(keyFile)
			? {
					key: readFileSync(keyFile),
					cert: readFileSync(certFile)
				}
			: undefined;

	return {
		https,
		host,
		port: 8000,
		cors: {
			origin: '*',
			methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
			credentials: true
		}
	};
};

/**
 * Vite plugin to export a CoreMedia-compatible non-module entrypoint to
 * bootstrap the rest of the app as type="module".
 */
const coremediaPlugin = (): Plugin => {
	let isBuild = false;

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
		config(config, { command }) {
			isBuild = command === 'build';
		},
		buildStart() {
			if (isBuild) {
				this.emitFile({
					type: 'chunk',
					id: 'src/coremedia.ts',
					name: 'coremedia'
				});
			}
		},
		generateBundle(options, bundle) {
			if (isBuild) {
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
			}
		},
		configureServer(server) {
			server.middlewares.use((req: any, res, next) => {
				if (req.url === '/coremedia.js') {
					res.setHeader('Access-Control-Allow-Origin', '*');
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
	plugins: [sveltekit(), coremediaPlugin()],
	server: getServer()
});

