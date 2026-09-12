# ADDCHEM Staff Portal Updates

- Removed the oversized login marketing copy and long scrolling login layout.
- Added Staff Login to the public website navigation; it changes to Staff Dashboard when an authenticated session exists.
- Added Customers directory with add/edit support.
- Billing now follows the supplied ADDCHEM tax invoice structure.
- Each line accepts quantity and rate; CGST is fixed at 9% and SGST at 9% and totals calculate automatically.
- Added live invoice preview and Download PDF.
- Billing saves the invoice and deducts the billed quantity from inventory.
- `scripts/customer-billing.sql` is the D1 migration for an existing database.
