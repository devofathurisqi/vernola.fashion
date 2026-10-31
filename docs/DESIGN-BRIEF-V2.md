# Vernola V2 — working brief and acceptance criteria

Act as a senior product designer and frontend engineer. Deliver a distinctive, strongly pink fashion storefront and a practical inventory workspace, keeping the actual product photography truthful. Build complete interaction states; evaluate the result on desktop and mobile before handoff.

## Visual direction

- Primary identity: vivid raspberry #d52378, candy pink #f8a8ce, pale pink #fff1f7, deep berry #47132e; white space balances stronger pink panels. Preserve original logo design and use real supplied photos.
- Storefront: generous editorial hero with oversized serif title, pink composition and layered arched photography; category browsing, curated collection, dense but calm catalog. Clear hierarchy: image, category, name, price, available colors. No invented offers, discounts, reviews or sales counts.
- Admin: independent application shell, berry sidebar, rose workspace, clear table/cards, useful inventory counts, search/filter/sort, product editor with sections and sticky actions. No fake sales charts because there are no orders/payments.
- Mobile: real navigation, touch controls >=40 px where possible, responsive table alternatives, no horizontal page overflow. Accessible dialogs, labels, keyboard focus, reduced motion.

## System

- Username login backed by Supabase Auth. No password in frontend, fixtures, README, or migrations.
- Reusable tenant structure with RLS and immutable tenant provenance; migrate existing project additively. Preserve manually edited products on repeated imports.
- Product SKU, featured selection, timestamps and optimistic update conflict handling. Stock remains manual with confirmation option; optional colors maintain stable IDs and images.
- Real category CRUD with ordering. Store contact settings shared by all purchase links. Images resize before upload; reorder gallery, preview, remove, rollback/cancel cleanup.
- Import all Vuyama catalog entries as Vernola-owned rows, with authentic images and variant mappings. Use verified supplier retail reference rather than another store's custom prices; unknown prices remain inquiries and stock is never fabricated.
- Persist bag/favorites with safe validation. Revalidate price, variants and stock before WhatsApp draft. Pagination, lazy images, responsive image assets, locally hosted fonts, lazy admin bundle, scoped catalog cache with explicit refresh.

## Definition of done

Build and domain tests pass; database migration and RLS are checked on disposable local PostgreSQL; storefront and dashboard are visually checked across desktop/mobile. Clearly identify hosted migrations that await user execution. Do not claim unperformed hosted checks, zero recurring cost, or deployment. Update handoff docs around the final implementation.

## Original logo edit record

Built-in Imagegen, from the user's original JPEG: “Use case: text-localization. Edit the supplied logo. Preserve the original stylized initial V, hijab silhouette, magenta and mauve colors, calligraphic lettering style, shadows, and pale blush solid background. Change only the suffix .hijab to .fashion. The user states the brand name is Vernola.fashion: render the complete wordmark exactly Vernola.fashion, in the same elegant connected copperplate script as reference, retaining the large original initial V. No other text or graphics. Landscape tightly framed logo with modest clear margins, high resolution. Match reference as closely as possible.”

V2 keeps that logo. Photo work in V2 is resizing/encoding only; source product images are authentic. A generative edit cannot guarantee identical source font/pixels.
