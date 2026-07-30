# Hướng dẫn Kế toán

Trang này dành cho **Kế toán (Accountant)**: theo dõi sổ cái, lập báo cáo tài chính, và đọc báo cáo lãi lỗ (PNL). Tỷ giá do Quản lý khai; Kế toán dùng để đối chiếu quy đổi.

---

## 1. Sổ cái (Ledger)

Vào **Sổ cái** (`#/accounting/ledger`). Đây là nơi xem toàn bộ bút toán, công nợ và số dư.

- Mỗi lô hàng khi phát sinh doanh thu/chi phí đều lên bút toán ở đây — dùng để theo dõi công nợ phải thu (AR) và phải trả.
- Lọc theo khách hàng, kỳ, hoặc lô hàng để đối chiếu.
- Bút toán đảo (void / reversal) hiển thị rõ để không nhầm với bút toán gốc.

![Sổ cái tổng hợp và bút toán](/docs/onboarding/img/e33-accountant-01-ledger.png)

---

## 2. Báo cáo tài chính

Vào **Báo cáo tài chính** (`#/accounting/reports`). Nơi kết xuất các báo cáo: bảng cân đối thử (TB), báo cáo kết quả kinh doanh (P&L), bảng cân đối kế toán (BS).

- Chọn kỳ báo cáo, app tổng hợp từ sổ cái.
- Số liệu quy đổi ngoại tệ lấy theo tỷ giá Quản lý đã khai — kiểm tra độ lớn con số cho hợp lý trước khi chốt.

![Báo cáo tài chính theo kỳ](/docs/onboarding/img/e33-accountant-02-financial-reports.png)

---

## 3. Báo cáo lãi lỗ (PNL)

Vào **Báo cáo PNL** (`#/manager/reports/pnl`). Kế toán **đọc** báo cáo lãi lỗ theo từng lô / từng Sales / theo tháng.

- Xem doanh thu, chi phí và biên lợi nhuận (margin) từng lô hàng.
- Dùng để đối chiếu với sổ cái và làm cơ sở tính hoa hồng.

![Báo cáo lãi lỗ theo lô và theo Sales](/docs/onboarding/img/e33-accountant-03-pnl-report.png)

---

## Ghi chú về tỷ giá

Tỷ giá (`#/manager/fx-rates`) do **Quản lý** khai và sở hữu. Kế toán chỉ đọc để quy đổi trong sổ cái và báo cáo — không sửa. Nếu thấy tỷ giá sai, báo Quản lý cập nhật.
