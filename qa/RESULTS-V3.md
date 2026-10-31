# Vernola final enhancement — verification V3

31 October 2026, Asia/Jakarta. Supersedes V1/V2 status for the current implementation. No production deployment or Lighthouse score is claimed.

## Database and shared assets

The user confirmed FINAL-SHARED-LIBRARY.sql succeeded on the hosted Supabase project. The public API now serves 31 active products / 9 categories. There are 27 shared Vuyama masters, 468 canonical variants, and 27 lightweight Vernola references; the four original Vernola examples remain independent.

The authenticated hosted verification passed all of the following after migration:

- Auth login for the account behind username vernola.
- One compact public bootstrap with 31 cards; no card contains more than five variant previews.
- All 27 linked physical listings have empty replicated gallery, description and variant columns.
- Effective details include the complete 65-color and 82-choice products.
- Anonymous requests cannot use admin catalog context.
- Store administrators cannot write master records; the public can read them.
- Re-attaching an existing library product returns its existing listing, rather than duplicating it.
- Shared WebP can be retrieved publicly.
- Temporary category/draft CRUD, anonymous draft denial, optimistic revision conflict detection, in-use category deletion protection, per-store WebP upload/retrieval, and audit generation all still work.

Temporary QA product/category/image were removed in finally cleanup; audit entries remain. Actual selling stock, price and catalog content were not changed by verification. A same-value master write attempt was denied. The login password was supplied through hidden stdin and not stored in source.

The shared Storage upload completed 820/820 files: 410 authentic photos, each with 360px and 960px WebP versions, 24,393,990 bytes total. The bucket is vuyama-library, path version v1, cache max-age one year. There are no client write/delete policies for this bucket. No local supplier photo folder remains in dist; previous generated copies are isolated under ignored .tools for local recovery.

## Local database checks

The disposable PostgreSQL 18 harness passed shared-library RLS and constraints: anonymous public master read, master write denial for anon and authenticated users, invoker-view draft/tenant isolation, anonymous admin-context denial, idempotent draft attach for a second store, no copied gallery/variant data, store-only variant stock overrides with master stock unchanged, immutable linked reference, unknown variant rejection, and master Storage client-upload denial. Auth/Storage in these local tests are mocks; hosted checks above separately validate the real backend.

A migration preservation fixture inserted an already-edited legacy listing and reran the seed: custom name, description, price, photo and variant stock survived; listing IDs were preserved. Seed rerun inserted no duplicate masters or linked listings. Local test records were removed and the disposable database server was stopped after testing.

## Browser verification

Both development and the actual production build were exercised against hosted Supabase:

- Navbar computed background is rgb(253, 233, 233), matching the sampled #fde9e9 logo edge. The visible logo rectangle blends into the navbar.
- Desktop production storefront at 1440px: page scrollWidth 1425px, no horizontal overflow, no broken loaded images, no captured error logs.
- Customer at 390px: page scrollWidth 375px, no horizontal overflow. Strong pink hero/navbar rendered correctly.
- Mobile menu provides favorites; opening it shows the proper empty favorite state and returning restores all products.
- Paris Legend card reports all 65 colors, while its bootstrap contains only five previews. Opening the detail fetches the full choices. Searching Baby Pink returns one match and choosing it changes the image to the shared shade URL.
- On the production mobile build, Baby Pink adds to the bag for Rp29,000. Increasing quantity to two shows Rp58,000. Refresh preserves that exact variant/quantity. The test bag line was removed afterward.
- Dashboard actual username login succeeds. Summary reports 31 products / 9 categories. Inventory search and the linked editor expose all 65 Paris Legend rows and the explanation that changes only affect this store. Closing without edits leaves data unchanged.
- The production Katalog Vuyama picker lists 27 masters. Searching Paris returns Paris Japan (21 choices) and Paris Legend (65 colors), both correctly marked already added/disabled for Vernola.
- Admin inventory and supplier picker fit a 390px page. Library cards are responsive, with no broken loaded photos or captured error logs. Metadata contrast/text sizes were improved after visual inspection. At 360px the library changes to one column; page scrollWidth is 345px, with no horizontal overflow.

No WhatsApp message was sent. Checkout validation is covered by domain tests and uses freshly fetched full products, never the five-preview card array. There is no payment, reservation or stock deduction feature.

Screenshots in this directory: storefront-desktop.jpg, storefront-mobile.jpg, dashboard-desktop.jpg, library-desktop.jpg, library-mobile.jpg.

## Measured performance

The before/after JSON files were measured on the same hosted 31-product catalog, outside the browser. Sizes below are decoded API bytes; gzip figures are local gzip estimates, not an assertion of the server's wire encoding or user latency.

| Initial catalog | V2 before | Final |
| --- | ---: | ---: |
| Requests | 3 | 1 |
| Decoded bytes | 85,376 | 43,326 |
| Gzip estimate | 16,298 | 9,540 |
| Full variants initially transferred | 476 | At most five previews per product |

Initial decoded payload is 49.3% smaller; estimated gzip payload is 41.5% smaller. The 82-choice Segi4 Motif Tryspan detail is 18,502 bytes and fetched only on demand.

Production build sizes, approximate decimal KB gzip:

| JavaScript chunk | Gzip |
| --- | ---: |
| React vendor, initial | 69.03 KB |
| Customer application, initial | 13.71 KB |
| Product detail, lazy | 2.46 KB |
| Admin application, lazy | 15.42 KB |
| Supabase SDK, admin only | 58.97 KB |
| Supplier picker, lazy | 1.54 KB |

Customer entry JS is about 82.7 KB gzip, down from 95.5 KB in V2. CSS, fonts, images and API data are separate. The large supplier image manifest is removed from the customer entry. Only 14 local image entries remain; remote responsive URLs are derived without importing 410 image mappings. Full supplier details are fetched on demand; master/preview JSON is isolated in lazy chunks, outside the customer entry. All five original fonts remain converted from 725,600 bytes TTF to 185,836 bytes WOFF2; only used weights are requested.

Photos are shared across stores rather than copying the previous 81,208,670 bytes of supplier files into each deployment. The shared prepared versions total about 24.4 MB once. Cache does not imply zero bandwidth or unlimited storage. Bootstrap cache is 30 seconds, detail cache 60 seconds; checkout forces fresh catalog/contact and basket-only full detail reads.

## Tests/build and handoff

npm test: 17/17 passed. Tests cover domain validation, price/stock/quantity/total bounds, safe photo URLs, actual retail pricing, all shared asset references, complete card color counts and sparse overrides including stock changes, removal/disabled colors, missing master rejection and stable comparisons.

npm run build passed. The verifier checks local responsive files, every registered shared gallery/shade/thumbnail reference, absence of a duplicated supplier directory, absence of secret/password patterns in bundles, and absence of customer HTML preload of the Supabase SDK.

README.md, docs/NEXT-CLIENT.md and the root README-PAKET-DASHBOARD.md describe the shared database, tenant setup, master/local behavior, operator asset workflow, deployment settings and limitations. No additional SQL is pending for the current task. Production preview is retained at http://127.0.0.1:4183/ and /admin. Vercel deployment remains unperformed.
