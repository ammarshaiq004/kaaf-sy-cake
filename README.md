# Kaaf sy Cake

Website for **Kaaf sy Cake**, a premium home bakery in Lahore (est. 2026). Freshly made, beautifully crafted.

The site is a static multi-page build. The centrepiece is the **Cake Customization Studio** (`/studio.html`), a ten-step designer with a live 2.5D cake preview that ends by sending the finished design to the bakery on WhatsApp.

## Pages

| Route | Page |
| --- | --- |
| `/` | Home |
| `/cakes.html` | Our Cakes: customized, bento, chocolate fudge, buttercream, fondant |
| `/studio.html` | Cake Customization Studio |
| `/treats.html` | Brownies, cupcakes and sweet treats: cupcakes, brownies, naan khatai, tea cakes, mini loaves |
| `/story.html` | Our Story |
| `/reviews.html` | Customer Reviews (real reviews only; shows an honest empty state until there are some) |
| `/contact.html` | Contact / Order, with an inquiry form that opens WhatsApp |

## Stack

- [Vite](https://vite.dev) with TypeScript (strict). No runtime dependencies and no UI framework.
- Shared header, footer and logo live in `src/partials/` and are stitched into each page at build time by a small plugin in `vite.config.ts` (`<!-- include:header page="cakes" -->`).
- The cake preview is a procedural SVG renderer (`src/cake/`). Shapes, frostings, colours, decorations and the message are drawn from data, so every combination the studio allows can be previewed without photos or 3D models.
- Motion uses the Web Animations API, CSS and a single `requestAnimationFrame` loop. Everything respects `prefers-reduced-motion`, and no animation ever blocks a button.

## Scripts

```bash
npm install
npm run dev        # local dev server on http://localhost:4174
npm run build      # typecheck + production build into dist/
npm run preview    # serve dist/ on http://localhost:4174
npm run lint       # ESLint
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright, desktop + mobile)
npm run check      # typecheck, lint, unit tests and build
```

## Deploying

The live site is on GitHub Pages at https://ammarshaiq004.github.io/kaaf-sy-cake/. `.github/workflows/pages.yml` builds the site and publishes `dist/` on every push to `master`. In the repository settings, **Pages > Build and deployment > Source** must be set to **GitHub Actions**; publishing straight from the branch serves the unbuilt source files.

For Netlify, `netlify.toml` sets the build command (`npm run build`) and publish folder (`dist`), so a Netlify site linked to this repository builds correctly with no dashboard settings. The build uses relative paths, so `dist/` also works as-is on any other static host or a custom domain. Keep links and image paths relative (`cakes.html`, `images/...`), never starting with `/`; the `pages` Playwright project serves the build under `/kaaf-sy-cake/` to catch that.

## Where things live

| What | File |
| --- | --- |
| WhatsApp number, city, lead time | `src/data/bakery.ts` (`BAKERY`) |
| Occasions, shapes, sizes, flavours, frostings, palettes, decorations | `src/data/bakery.ts` |
| Studio compatibility rules (e.g. no fondant on bento) | `src/studio/design.ts` |
| WhatsApp message wording | `src/lib/whatsapp.ts` |
| Products and their photos / optional prices | `src/data/products.ts` |
| Customer reviews | `src/data/reviews.ts` |
| Brand colours and fonts | `src/styles/tokens.css` |

Items in `src/data/bakery.ts` marked `CONFIRM` are sensible defaults the bakery should check. See [docs/ASSETS.md](docs/ASSETS.md) for the photos and details still needed.

## Content rules

- No prices, availability, reviews or testimonials are shown unless the bakery has supplied them.
- The studio never says an order is confirmed. Orders are confirmed by the bakery on WhatsApp.
- Studio previews are labelled as concept previews. Reference photos are treated as inspiration, never as a promise of an exact replica.
