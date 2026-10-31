# Vernola V2 — verification

Date context: 31 October 2026, Asia/Jakarta. This report supersedes the initial V1 verification and pending-setup notes.

## Online backend

The user executed the original setup and then UPGRADE-VERNOLA.sql successfully. Supabase returns 31 public products and 9 categories. The admin account was provisioned through the Admin API using the user's explicitly approved internal email alias; credentials were supplied through hidden stdin and were not written to source.

Hosted verification passed:

1. Auth login using the account backing username vernola.
2. Create temporary category and draft product, then update that product.
3. Anonymous client cannot read the draft.
4. Revision increments on save; a stale revision cannot overwrite the newer row.
5. Deletion of a category still referenced by a product is blocked.
6. Authenticated WebP upload and public retrieval of that image succeed.
7. Product/category triggers create audit events.

Temporary product/category/file were deleted by the test's finally cleanup. QA activity remains in the audit trail. The actual catalog and selling stock were not altered by testing.

## Local security

PostgreSQL 18 disposable local database passed the original RLS harness and V2 checks: draft isolation, cross-tenant insert/update denial, membership self-escalation denial, Storage folder ownership, immutable product tenant/ID, immutable store slug, optimistic revisions, audit generation, audit isolation, anonymous audit denial. Local Auth/Storage schemas are mocks; hosted behavior was separately checked as above.

## Browser checks

- Actual online username login succeeds and dashboard reports 31 products / 9 categories.
- Desktop storefront hero, editorial composition, category rail, cards, and pink identity rendered; hero inset photo size corrected after visual inspection.
- Admin overview, inventory search and editor rendered. Paris Legend search returns one row and editor contains all 65 color rows.
- Unsaved edit protection: cancel opens confirmation; “Lanjut edit” retains the edited field; “Buang perubahan” closes editor without saving.
- At 390 px, admin table fits the page with deliberate internal horizontal tabs; sidebar hides, mobile controls remain available, no horizontal page overflow.
- At 390 px, customer hero and bag rendered; search Paris Legend returns one result; choosing Baby Pink selects the mapped shade photo and adds the correct variant/price to the bag. Refresh retains that bag line.
- Mobile menu Atasan filters catalog to one blouse and closes the menu.
- At 360 px, customer page scrollWidth=345 with innerWidth=360 (scrollbar); no page overflow, two catalog columns.
- Desktop layout checked at 1440 px. No WhatsApp message was sent. Checkout message/total validation is covered by domain tests; no live payment or stock reservation claimed.

## Tests and build

`npm test`: **11/11 pass**. Covers invalid prices/stocks/quantities, optional-color transitions, duplicate color names/IDs, per-color stock, safe totals, unsafe image URLs, gallery limit, explicit category removal, actual Vuyama retail pricing, and existence of every imported image reference.

Final production build passes. Approximate gzip sizes:

| Asset | Gzip |
| --- | ---: |
| React vendor | 69.03 KB |
| Customer application | 26.50 KB |
| Customer CSS | 7.02 KB |
| Admin application (lazy) | 14.40 KB |
| Admin CSS (lazy) | 8.40 KB |
| Supabase SDK (admin only) | 58.97 KB |

Entry customer JavaScript is approximately 95.5 KB gzip, excluding fonts/images/CSS. The initial V1 configured monolithic JS was about 140.4 KB gzip. This is a bundle comparison, not a Lighthouse or real-world latency claim.

Build verifier checks **424 responsive image manifest entries**, referenced built files, no secret/password in emitted bundles, and no Supabase SDK preload in customer HTML. Fonts are local WOFF2. All five source fonts were converted losslessly from 725,600 bytes TTF to 185,836 bytes WOFF2 (74.4% smaller); only used weights are requested by the browser. Vuyama originals/variants are locally hosted; no Drive image hotlinks.

## Handoff

Production build preview retained on port **4183**, customer `/`, admin `/admin`. No new SQL remains required for this implementation. Vercel deployment and production domain remain unperformed. Current prices are verified source retail references or inquiry states; business owner can edit them in the dashboard. Stock remains confirmation/manual by design.

The generated logo remains an approximation of the original lettering and needs owner review for exact brand fidelity. No pixel-perfect or identical-font guarantee is made.
