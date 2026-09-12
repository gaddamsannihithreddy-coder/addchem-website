# ADDCHEM Catalogue Settings

Staff users can open **Settings → Modify Catalogue** to search the public catalogue, edit existing products, add new products, and remove products from the public catalogue.

Catalogue changes are stored in D1 in `catalogue_overrides` and the public homepage/catalogue merge those changes with the base catalogue.

## One-time D1 migration
Run:

`scripts/catalogue-settings.sql`

against the same D1 database used by the staff portal.
