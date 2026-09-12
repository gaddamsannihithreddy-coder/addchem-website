# ADDCHEM Cloudflare Inventory + Billing

This folder contains the ADDCHEM public catalogue plus the private staff inventory/billing backend.

## Cloudflare
- Worker name: `addchem-website`
- D1 database: `addchem-inventory`
- D1 database ID: `6d1446a2-ca88-4571-b77d-78170bc23ecd`
- D1 binding: `DB`

## Staff
- Staff dashboard: `/staff.html`
- Inventory data is not shown in the public catalogue.
- SKU + Grade identify distinct stock records; the same CAS number may have multiple grades.
- Quantity is an integer count of sellable units; unit is selected from Bottle, Packet, Box, Vial, Tube, Ampoule, Can, Bag, Drum, Piece, Set, Other.

## Billing
- Billing reduces the exact SKU/grade inventory quantity.
- Every stock/billing change is recorded in `inventory_movements`.

## Before first deployment
1. The D1 schema must already be applied (it is in the database when this project was prepared).
2. Deploy from the directory containing `wrangler.toml`.
3. Create the first admin/staff account using `scripts/create-staff.mjs` with Wrangler. Do not put passwords into source control.
4. Verify `/staff.html` before inviting additional staff.
