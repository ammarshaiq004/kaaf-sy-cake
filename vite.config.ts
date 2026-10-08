import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pages = ['index', 'cakes', 'studio', 'treats', 'story', 'reviews', 'contact'];

/**
 * Tiny HTML partials: `<!-- include:header page="cakes" -->` is replaced with
 * src/partials/header.html. Links whose data-nav matches `page` get
 * aria-current="page" at build time, so navigation state works without JS.
 */
function htmlPartials(): Plugin {
  const pattern = /<!--\s*include:([\w-]+)(?:\s+page="([\w-]+)")?\s*-->/g;
  return {
    name: 'kaaf-html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Partials may include other partials; expand until stable.
        let out = html;
        for (let depth = 0; depth < 5 && pattern.test(out); depth++) {
          pattern.lastIndex = 0;
          out = out.replace(pattern, (_match, name: string, page?: string) => {
            let partial = readFileSync(resolve(__dirname, `src/partials/${name}.html`), 'utf8');
            if (page) {
              partial = partial.replace(
                new RegExp(`data-nav="${page}"`, 'g'),
                `data-nav="${page}" aria-current="page"`,
              );
            }
            return partial;
          });
          pattern.lastIndex = 0;
        }
        return out;
      },
    },
  };
}

export default defineConfig({
  // Relative base so the same build works at a domain root and under
  // GitHub Pages' /kaaf-sy-cake/ project path.
  base: './',
  // Multi-page site: unknown URLs should 404 rather than fall back to index.html.
  appType: 'mpa',
  plugins: [htmlPartials()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(__dirname, `${p}.html`)])),
    },
  },
  server: { port: 4174 },
  preview: { port: 4174 },
});
