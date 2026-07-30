# Hướng dẫn Sales — Quy trình đầy đủ & rút gọn

Trang này dành cho **Sales**: từ báo giá tới lô hàng, vận hành và công nợ. Có **hai quy trình**:

- **Quy trình đầy đủ** — 4 bước, dùng cho khách mới / lô cần chào giá và có nghiệp vụ vận hành.
- **Quy trình rút gọn** — chỉ 2 bước, bỏ bước Báo giá và bước Operations.

---

## Quy trình ĐẦY ĐỦ (Full) — 4 bước

### Bước 1 — Báo giá (Quote)

Vào **Báo giá mới** (`#/sales/quote/new`). Nhập khách hàng, tuyến (POL → POD), loại container, và ít nhất một dòng cước (amount + currency). Bấm **Lưu nháp**.

- Nếu giá thấp hơn **15%** so với báo giá gần nhất đã chốt cho cùng tuyến, Quản lý phải **duyệt** trước khi gửi.

![Màn hình tạo báo giá mới](/docs/onboarding/img/e33-sales-01-quote-new.png)

Sau khi được duyệt (hoặc không cần duyệt), vào **Danh sách báo giá** (`#/sales/quote`): bấm **Gửi khách hàng**, khi khách đồng ý bấm **Đánh dấu đã chấp nhận**, rồi **chuyển thành lô hàng** chỉ với một cú bấm.

![Danh sách báo giá — gửi khách và chấp nhận](/docs/onboarding/img/e33-sales-02-quote-list-send.png)

### Bước 2 — Tạo lô hàng + PNL

Vào **Tạo PNL** (`#/sales/me/pnl/new`). Điền từng trường: khách hàng, tuyến POL → POD, container, ETD, hãng tàu, các dòng chi phí và doanh thu. **Số Job (Job No) được cấp tự động** tại bước này; với HBL thì HBL No = D/O No = Job No.

![Form tạo lô hàng + PNL, Job No hiển thị](/docs/onboarding/img/e33-sales-03-shipment-new-form.png)

### Bước 3 — Operations (chi phí & chứng từ)

Vào **Lô hàng** (`#/shipments`) rồi mở chi tiết một lô. Tại đây xử lý nghiệp vụ vận hành:

- Chuyển **trạng thái** lô hàng qua bảng kanban.
- Thêm các dòng **chi phí vận hành** phát sinh.
- Quản lý **chứng từ**: D/O, HBL.

![Chi tiết lô hàng — trạng thái, chứng từ D/O, HBL](/docs/onboarding/img/e33-sales-05-shipment-detail-ops.png)

### Bước 4 — Billing / Công nợ

Vào **Sổ cái** (`#/accounting/ledger`). Lô hàng lên hóa đơn, công nợ phải thu (AR) và bút toán sổ cái.

![Sổ cái — hóa đơn và công nợ](/docs/onboarding/img/e33-sales-06-ledger-billing.png)

---

## Quy trình RÚT GỌN — chỉ Bước 2 → Bước 4

Quy trình rút gọn **bỏ Bước 1 (Báo giá)** và **bỏ Bước 3 (Operations)**. Chỉ làm:

1. **Bước 2 — Tạo lô hàng + PNL** (`#/sales/me/pnl/new`).
2. **Bước 4 — Billing / Công nợ** (`#/accounting/ledger`).

**Vì sao bỏ được?**

- **Bỏ Bước 1 (Báo giá):** khách quen, đã có giá sẵn — không cần chào giá lại nên không tạo quote.
- **Bỏ Bước 3 (Operations):** lô nominated / đơn giản, không phát sinh nghiệp vụ vận hành cần xử lý — tạo lô xong đi thẳng ra công nợ.

Sales tạo lô trực tiếp và lô đi thẳng tới billing.

![Rút gọn — tạo lô hàng + PNL trực tiếp](/docs/onboarding/img/e33-sales-03-shipment-new-form.png)

![Rút gọn — đi thẳng tới sổ cái / công nợ](/docs/onboarding/img/e33-sales-06-ledger-billing.png)
