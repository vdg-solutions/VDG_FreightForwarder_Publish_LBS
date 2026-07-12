# Job Cost / P&L Import Template

File: `job_cost_template.xlsx` — sheet name must be `PnL`.

## Required columns

| Column | Type | Values |
|---|---|---|
| ShipmentRef | string | e.g. `EX-260612-001` |
| EntryType | enum | `Cost` or `Revenue` |
| Kind | string | e.g. `OceanFreight`, `Haulage`, `Customs` |
| Description | string | free text |
| Currency | enum | `USD`, `VND`, `EUR`, `SGD`, `JPY` |
| Amount | number | decimal, can be negative (credit) |
| ExchangeRate | number | > 0; use `1.0` for base currency |

## Optional columns

| Column | Type | Notes |
|---|---|---|
| CostRef | string | internal PO / cost reference |
| Vendor | string | supplier / carrier name |

## Validation rules

- `EntryType` is case-insensitive; stored as canonical case (`Cost`, `Revenue`).
- `Currency` is case-insensitive; stored uppercase.
- `ExchangeRate` must be strictly positive.
- Duplicate rows (same `ShipmentRef + EntryType + Kind`) within one file are rejected.
- Mixed valid/invalid rows: invalid rows are reported but do not abort the import.

## Sample rows

| ShipmentRef | EntryType | Kind | Description | Currency | Amount | ExchangeRate | CostRef | Vendor |
|---|---|---|---|---|---|---|---|---|
| EX-260612-001 | Cost | OceanFreight | FCL HCM-LAX | USD | 2850.00 | 1.0 | PO-001 | MSC Vietnam |
| EX-260612-001 | Revenue | OceanFreight | Freight charge to customer | USD | 3200.00 | 1.0 | | Acme Logistics |
| EX-260612-001 | Cost | Haulage | Truck to Cai Mep | VND | 4500000 | 25400 | PO-002 | An Loc Transport |
