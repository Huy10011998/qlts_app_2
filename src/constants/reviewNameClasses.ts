export const REVIEW_NAME_CLASSES = [
  "BinhChuaChay",
  "HongChuaChay",
  "TuChuaChay",
];

export const REVIEW_NAME_CLASSES_DANHGIA = [
  "DanhGia_BinhChuaChay",
  "DanhGia_HongChuaChay",
  "DanhGia_TuChuaChay",
];

/**
 * Class thiết bị → class đánh giá tương ứng (`BinhChuaChay` →
 * `DanhGia_BinhChuaChay`), để kiểm quyền `Class.DanhGia_*.Read` trước khi mở
 * mục "Đánh giá".
 *
 * Hai mảng trên phải cùng thứ tự — ghép theo chỉ số, không tự nối chuỗi
 * `"DanhGia_" + nameClass` vì tên bảng đánh giá là do server đặt, không phải
 * quy tắc app tự suy.
 */
export const getDanhGiaNameClass = (nameClass?: string | null) => {
  const index = REVIEW_NAME_CLASSES.indexOf(nameClass ?? "");

  return index === -1 ? null : REVIEW_NAME_CLASSES_DANHGIA[index];
};
