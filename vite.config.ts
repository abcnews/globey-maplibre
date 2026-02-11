import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

const coremediaPlugin = (): Plugin => ({
	name: 'coremedia-proxy',
	generateBundle(options, bundle) {
		const entry = Object.values(bundle).find(
			(chunk) => chunk.type === 'chunk' && chunk.name === 'coremedia'
		);
		if (entry && 'fileName' in entry) {
			this.emitFile({
				type: 'asset',
				fileName: 'coremedia.js',
				source: `import './${entry.fileName}';\n`
			});
		}
	}
});

export default defineConfig({
	plugins: [sveltekit(), coremediaPlugin()],
	build: {
		rollupOptions: {
			input: {
				coremedia: 'src/coremedia.ts'
			}
		}
	}
});
