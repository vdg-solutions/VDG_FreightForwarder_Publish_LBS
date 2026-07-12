// F-15-12 — Dunning ladder constants

export const DUNNING_LADDER_DAYS = {
  reminder_1: 7,
  reminder_2: 14,
  escalate:   30,
  legal:      60,
  blacklist:  95,
};

export const DUNNING_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

export const DUNNING_DEFAULT_TEMPLATES = {
  gentle: {
    vi: {
      subject: 'Nhắc nhở thanh toán — {customer_name}',
      body:
        'Kính gửi {customer_name},\n\nChúng tôi xin nhắc nhở công nợ còn tồn đọng: {total_outstanding} VND ({days_overdue} ngày quá hạn).\nHóa đơn: {invoice_list}\n\nMong nhận được phản hồi sớm.\n\nTrân trọng,\nVDG FreightForwarder',
    },
    en: {
      subject: 'Payment reminder — {customer_name}',
      body:
        'Dear {customer_name},\n\nThis is a friendly reminder that your account has an outstanding balance of {total_outstanding} VND ({days_overdue} days overdue).\nInvoices: {invoice_list}\n\nPlease arrange payment at your earliest convenience.\n\nBest regards,\nVDG FreightForwarder',
    },
  },
  firm: {
    vi: {
      subject: 'Đôn đốc thanh toán lần 2 — {customer_name}',
      body:
        'Kính gửi {customer_name},\n\nĐây là thông báo đôn đốc thanh toán lần 2. Số dư chưa thanh toán: {total_outstanding} VND ({days_overdue} ngày quá hạn).\nHóa đơn: {invoice_list}\n\nVui lòng thanh toán trong vòng 7 ngày.\n\nTrân trọng,\nVDG FreightForwarder',
    },
    en: {
      subject: 'Second payment notice — {customer_name}',
      body:
        'Dear {customer_name},\n\nThis is your second payment notice. Outstanding: {total_outstanding} VND ({days_overdue} days overdue).\nInvoices: {invoice_list}\n\nPlease remit payment within 7 days to avoid account suspension.\n\nRegards,\nVDG FreightForwarder',
    },
  },
  final: {
    vi: {
      subject: 'KHẨN: Cuối cùng trước khi đưa pháp lý — {customer_name}',
      body:
        'Kính gửi {customer_name},\n\nSố dư {total_outstanding} VND đã quá hạn {days_overdue} ngày. Nếu không nhận được thanh toán trong 72 giờ, chúng tôi sẽ chuyển vụ việc sang bộ phận pháp lý.\nHóa đơn: {invoice_list}\n\nTrân trọng,\nVDG FreightForwarder',
    },
    en: {
      subject: 'URGENT: Final notice before legal — {customer_name}',
      body:
        'Dear {customer_name},\n\nYour account balance of {total_outstanding} VND is {days_overdue} days overdue. If payment is not received within 72 hours, this matter will be referred to our legal team.\nInvoices: {invoice_list}\n\nRegards,\nVDG FreightForwarder',
    },
  },
};
