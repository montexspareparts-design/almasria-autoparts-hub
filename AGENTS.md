# Architecture decisions

- Oil checkout may delete only the signed-in customer's unpaid orders; this allows failed item insertion cleanup without exposing paid orders.- Build-time prerender must fetch all products with pagination and fail the build on fetch errors; a partial site must never be published.

- SEO taxonomy, branch data and the product-to-model/type classifier live only in src/data/seoShared.js; the app and build scripts import it so crawler pages and live pages never drift.
- Model x part-type pages with zero matching products are noindexed and left out of the sitemap; thin pages must not be indexed.
