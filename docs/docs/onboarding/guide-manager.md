# Hướng dẫn Quản lý — Quản lý tài khoản

Trang này dành cho **Quản lý (Manager)**: mời nhân viên, phân quyền, và cấu hình các danh mục dùng chung của cả công ty. Đây là các việc chỉ Quản lý mới làm được.

---

## 1. Người dùng & phân quyền

Vào **Người dùng** (`#/admin/users`). Đây là nơi mời nhân viên mới và gán vai trò.

- Nhập email Google của nhân viên rồi bấm **Mời**. App tự tạo thư mục làm việc cho nhân viên đó trên Drive và cấp quyền truy cập (ACL) ngay tại bước phân vai — nhân viên không phải tự chọn thư mục nào.
- Chọn vai trò cho từng người: **Quản lý**, **Kế toán**, hoặc **Sales**. Vai trò quyết định nhân viên thấy được menu nào và vào được màn hình nào.
- Nhân viên đăng nhập bằng chính tài khoản Google được mời; app tự nhận vai trò đã gán.

![Danh sách người dùng và nút Mời nhân viên](/docs/onboarding/img/e33-manager-01-users-list.png)

Khi gán vai trò, quyền truy cập Drive được cấp tự động cho đúng phạm vi của vai trò đó.

![Gán vai trò cho nhân viên khi mời](/docs/onboarding/img/e33-manager-02-role-assign.png)

### Quyền bổ sung — "Giá cước"

Ngoài vai trò chính, mỗi nhân viên có thể được gán thêm **quyền bổ sung**. Hiện có một quyền:
**Giá cước**.

- Ai giữ quyền Giá cước mới sửa được **biểu cước hàng không (air-rates)**, **phụ phí địa phương
  (local-charges)** và **biểu cước đường biển (ocean-tariff)**.
- Gán được cho **bất kỳ ai**, không phụ thuộc vai trò chính: một bạn Sales vẫn có thể là người giữ
  biểu cước. Bật ô **Giá cước** trong modal thêm/sửa người dùng là xong.
- Trong danh sách người dùng, người có quyền này hiện một nhãn vàng **Giá cước** cạnh vai trò.

![Ô Quyền bổ sung — Giá cước trong modal thêm người dùng](/docs/onboarding/img/e33-manager-03-pricing-hat.png)

- **Quản lý không mặc định có quyền này.** Quản lý phân quyền và xem được mọi thứ, nhưng muốn tự sửa
  biểu cước thì phải tự gán quyền Giá cước cho mình. Đây là chủ ý: giá cước sai một dòng là sai mọi
  báo giá, nên việc sửa nó thuộc về người được giao đích danh.
- Tương tự, **Kế toán** giữ khách hàng, tỷ giá và sổ kế toán; Quản lý cũng không sửa trực tiếp ba
  mục này trong app.

Muốn thu quyền lại thì bỏ tick ô đó rồi lưu — app gỡ quyền ghi trên Drive ngay trong lần lưu ấy.

---

## 2. Biểu hoa hồng (Commission)

Vào **Quy tắc hoa hồng** (`#/manager/commission-rules`). Đây là nơi khai báo tỉ lệ hoa hồng áp cho Sales theo lợi nhuận từng lô hàng.

- Biểu hoa hồng dùng chung cho toàn bộ đội Sales; thay đổi ở đây áp cho các lô tính hoa hồng sau đó.
- Số liệu hoa hồng trên báo cáo được tính từ biểu này — sửa sai biểu là sai hoa hồng.

![Biểu quy tắc hoa hồng](/docs/onboarding/img/e33-manager-03-commission-rules.png)

---

## 3. Tỷ giá (FX Rates)

Vào **Tỷ giá** (`#/manager/fx-rates`). Khai báo tỷ giá quy đổi ngoại tệ về VND (hoặc ngược lại) dùng cho báo giá, PNL và sổ cái.

- Tỷ giá do Quản lý sở hữu; Kế toán và Sales chỉ đọc để quy đổi.
- Nhập đúng tỷ giá thực tế — một dòng chi 100 USD phải quy ra đúng số VND theo tỷ giá, không phải 1:1.

![Bảng tỷ giá ngoại tệ](/docs/onboarding/img/e33-manager-04-fx-rates.png)

---

## 4. Danh mục trạng thái lô hàng

Vào **Trạng thái lô hàng** (`#/masters/shipment-states`). Đây là danh mục các trạng thái mà một lô hàng đi qua (kanban), và các tên gọi thay thế (alias) để hệ thống nhận diện đúng.

- Trạng thái là danh mục có kiểm soát (enum) — không nhập tự do; Quản lý mở rộng qua danh mục này.
- Thêm alias để các cách gọi khác nhau vẫn map về đúng một trạng thái chuẩn.

![Danh mục trạng thái lô hàng](/docs/onboarding/img/e33-manager-05-shipment-states.png)

---

## 5. Danh mục dùng chung khác

Ngoài các mục trên, Quản lý còn quản lý các danh mục nền mà cả Sales dùng chung:

- **Khách hàng** (`#/masters/customers`) — gộp các khách trùng bằng nút **Gộp vào →**.
- **Biểu phí local** (`#/masters/local-charges`) — các khoản phí địa phương tại cảng.
- **Đơn vị tính** (`#/masters/units-of-measure`).
- **Hãng tàu** (`#/masters/ocean-carriers`) và **Biểu cước hãng tàu** (`#/masters/ocean-tariff`).

Sales chỉ **xem** được các danh mục này; chỉ Quản lý mới thêm/sửa/xóa.
