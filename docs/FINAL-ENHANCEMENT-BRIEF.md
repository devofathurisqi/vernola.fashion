# Final enhancement brief

Deliver a coherent pink fashion experience and a reusable supplier library. Match the navbar's solid background to the logo's edge color; keep original lettering and imagery. Improve readability, spacing, touch controls and empty states where inspection demonstrates a problem.

Store Vuyama master content once, with read-only public access. Each store keeps an isolated product listing, its selling price, stock, publication settings and only the content differences it chooses to customize. Clients must not modify supplier data or other stores. Shared photos live in one public versioned Storage bucket, not copied into every deployed frontend.

For performance, make the initial catalog response contain cards, not hundreds of full color records or gallery URLs. Load product details on demand, independently cache them, and revalidate full data on checkout. Split the detail dialog and supplier picker from the initial application. Remove the 410-image manifest from the customer entry and exclude shared image files from each build. Keep compressed local fonts and responsive images. Measure before/after payloads and build bytes; never invent Lighthouse scores.

Migration must preserve existing IDs, prices, stock, user edits and cart compatibility. Validate RLS on views, read-only master access, store-only sparse variant changes, import idempotence, optimistic updates and anonymous draft isolation. Test the completed storefront and dashboard on desktop and small screens. Update the README for future client setup.
