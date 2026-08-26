# document_template.xlsx — Format Contract

Sheet name: **Documents** (case-insensitive match).

## Column specification

| Column | Required | Type | Rules |
|---|---|---|---|
| ShipmentRef | Yes | Text | Non-empty; links row to a shipment |
| DocType | Yes | Enum | One of: `MBL`, `HBL`, `DO`, `SI`, `AN` (case-insensitive) |
| DocId | Yes | Text | Non-empty; unique per ShipmentRef within file |
| BlNumber | No | Text | Trimmed; empty = absent |
| ConsigneePty | No | Text | Trimmed; empty = absent |
| ShipperPty | No | Text | Trimmed; empty = absent |
| NotifyPty | No | Text | Trimmed; empty = absent |
| CommodityDesc | No | Text | No content validation |
| GrossWeight | No | Number | Decimal ≥ 0; negative values rejected with `INVALID_RANGE` |
| MeasurementCBM | No | Number | Decimal ≥ 0; negative values rejected with `INVALID_RANGE` |

## Header matching

`pick_sheet` selects the first sheet whose headers contain `ShipmentRef`, `DocType`, and `DocId`
(all three required; case-insensitive). Optional columns are resolved opportunistically — absent
columns yield `None` without error.

## DocType dropdown

Add an Excel in-cell dropdown (Data → Data Validation → List) for `DocType`
with values `MBL,HBL,DO,SI,AN` to prevent free-text entry.

## Numeric columns

`GrossWeight` and `MeasurementCBM` cells should be formatted as Number in Excel.
Values are parsed via `str::parse::<f64>()`; non-numeric text yields `INVALID_FORMAT`.

## Intra-file dedup

Duplicate `DocId` within the same `ShipmentRef` in one file is rejected with
`DUPLICATE_REF` (BusinessRule). Same `DocId` in different `ShipmentRef` rows is allowed.
