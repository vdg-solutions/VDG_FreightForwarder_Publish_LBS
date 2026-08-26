# booking_template.xlsx — Format Contract

Sheet name: any (first sheet matching all 10 headers is selected).

## Required columns (case-insensitive header match)

| Column | Required | Type | Rules |
|---|---|---|---|
| ShipmentRef | Yes | Text | Non-empty; unique within file |
| Customer | Yes | Text | Non-empty |
| Origin | Yes | Text | Non-empty |
| Destination | Yes | Text | Non-empty |
| ETD | No | Text | **YYYY-MM-DD only** — e.g. `2024-03-15`. ETD must be < ETA if both present. |
| ETA | No | Text | **YYYY-MM-DD only** |
| VoyageNo | No | Text | Trimmed; empty = absent |
| ContainerCount | Yes | Integer | ≥ 1 |
| ContainerType | Yes | Enum | One of: `20GP`, `40GP`, `40HC`, `45HC`, `REEF` (case-insensitive) |
| CargoDescription | No | Text | No content validation |

## Date format constraint

ETD and ETA cells **must be formatted as Text** in Excel (Format Cells → Text),
then typed as `YYYY-MM-DD`. Excel native date serials (`DataType::DateTime`) are
rendered as raw floats by calamine and will fail parsing with `INVALID_FORMAT`.
Add data-validation annotation in the template to remind users.

## Container type validation

Add an Excel in-cell dropdown (Data → Data Validation → List) for `ContainerType`
with values `20GP,40GP,40HC,45HC,REEF` to prevent typos at entry time.
