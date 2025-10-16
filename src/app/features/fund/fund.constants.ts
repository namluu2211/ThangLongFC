// fund.constants.ts
// Centralized constants for Fund feature

export const FUND_LOCAL_STORAGE_KEY = 'fund-transactions';
export const FUND_CURRENCY = 'VND';
export const FUND_DATE_FORMAT = 'vi-VN';

export const FUND_TRANSACTION_TYPES = [
  { value: 'income', label: 'Thu nhập' },
  { value: 'expense', label: 'Chi phí' }
];

export const FUND_CATEGORIES = [
  { value: 'dong_gop', label: 'Đóng góp thành viên' },
  { value: 'thuong', label: 'Tiền thưởng' },
  { value: 'tai_tro', label: 'Tài trợ' },
  { value: 'ban_do', label: 'Bán đồ' },
  { value: 'thu_khac', label: 'Thu khác' },
  { value: 'do_uong', label: 'Đồ uống' },
  { value: 'thue_san', label: 'Thuê sân' },
  { value: 'trang_phuc', label: 'Trang phục' },
  { value: 'thiet_bi', label: 'Thiết bị' },
  { value: 'an_uong', label: 'Ăn uống' },
  { value: 'y_te', label: 'Y tế' },
  { value: 'chi_khac', label: 'Chi khác' }
];
