# Architecture decisions

- Oil checkout may delete only the signed-in customer's unpaid orders; this allows failed item insertion cleanup without exposing paid orders.- Build-time prerender must fetch all products with pagination and fail the build on fetch errors; a partial site must never be published.
