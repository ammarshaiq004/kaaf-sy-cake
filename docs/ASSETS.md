# Assets and details still needed

The site works today without any of these. Each one makes it more real.

## Photos

No real photos were in the repository, so cakes are drawn by the studio renderer and treats use illustrations. Every such image is labelled "Illustration" on the site. Replace them as photos arrive.

| Photo | Where it goes | How to add it |
| --- | --- | --- |
| Product photos (2 to 5 per product) | Product cards and quick view on `/cakes.html` and `/treats.html` | Save as `public/images/products/<product-id>-1.webp`, `-2.webp`, … in **4:3**, about 1200×900, under 200 KB. Then list them in that product's `images` array in `src/data/products.ts`. The first photo becomes the card image; more than one turns on the quick-view gallery. |
| Review photos (optional) | `/reviews.html` | `public/images/reviews/<name>.webp`, 4:3. Set `photo` on the review in `src/data/reviews.ts`. |
| Bakery or baker photo (optional) | `/story.html` | Ask and it can be added beside the story text. |

Product ids: `customized`, `bento`, `chocolate-fudge`, `buttercream`, `fondant`, `cupcakes`, `brownies`, `naan-khatai`, `tea-cakes`, `mini-loaves`.

## Logo

The official circular logo is in `public/images/brand/` (`logo-256.webp` for the header and footer, `logo-640.webp` for the story page), cut from the supplied file with a transparent background. The favicon and home-screen icon (`public/favicon-48.png`, `public/apple-touch-icon.png`) come from the same file. A vector (SVG) version would make it sharper on very large screens, if one exists.

## Reviews

Add real reviews, shared with the customer's permission, to `src/data/reviews.ts`:

```ts
{ name: 'Ayesha', text: 'The bento cake was perfect!', occasion: 'Birthday', photo: '/images/reviews/ayesha.webp' }
```

## Prices

Products show "Price confirmed on WhatsApp" by default. To show a price, set `startingPrice` on the product in `src/data/products.ts`, for example `'From Rs 2,500'`.

## Details to confirm (`src/data/bakery.ts`)

- **Sizes per shape.** Round: bento, 1 to 4 lb. Square: 2 to 4 lb. Heart: 1 to 3 lb. Custom shape: 1 to 4 lb.
- **Flavours.** Vanilla, chocolate, chocolate fudge, caramel and Lotus Biscoff.
- **Frostings.** Cream, buttercream, fondant, buttercream with fondant, chocolate fudge.
- **Rules.** Bento cakes cannot have fondant or toppers. The minimalist style cannot be combined with heavy decorations (butterflies, florals, pearls, chocolate pieces, themed topper).
- **Lead time.** Orders at least 2 days ahead (`BAKERY.leadTimeDays`).
- **Message length.** 40 characters on the cake, 16 on a name topper.
