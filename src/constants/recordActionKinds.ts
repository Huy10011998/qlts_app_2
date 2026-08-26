/**
 * Các loại việc có thể làm với một bản ghi tài sản.
 *
 * "other" là loại của mọi việc app chưa đặt tên: nó **vẫn hiện đủ** ở thanh hành
 * động và bảng chọn của màn chi tiết (nguồn là `getClassReference`, hoàn toàn
 * động), chỉ là chưa chọn được làm chế độ quét — vì bảng chọn chế độ phải liệt
 * kê được các việc TRƯỚC khi quét, lúc đó chưa biết bản ghi thuộc class nào.
 */
export type RecordActionKind =
  | "danhGia"
  | "kiemKe"
  | "baoHong"
  | "trungChuyen"
  | "xacNhanViTri"
  | "other";

export type NamedRecordActionKind = Exclude<RecordActionKind, "other">;

export type RecordActionKindInfo = {
  kind: NamedRecordActionKind;
  label: string;
  /** Tên icon Ionicons. */
  icon: string;
  /**
   * Tiền tố tên class con mà server trả về, ví dụ "KiemKe" khớp cả
   * `KiemKe_BinhChuaChay`, `KiemKe_HongChuaChay`, `KiemKe_TuChuaChay`…
   *
   * Thiếu tiền tố = loại này không đến từ bảng con (nghiệp vụ có màn riêng trong
   * app, tự khai `kind` ở builder của nó).
   */
  childClassPrefix?: string;
};

/**
 * MỘT dòng cho MỘT loại việc — không phải một dòng cho một cặp class.
 *
 * Thêm nghiệp vụ mới mà BE trả về dạng bảng con thì chỉ cần thêm một dòng ở đây:
 * thanh hành động, bảng chọn và chế độ quét đều tự có, không phải sửa màn nào.
 *
 * KHÁC BIỆT quan trọng với `reviewNameClasses.ts`: chỗ đó cấm **tự nối** tên
 * class (`"DanhGia_" + nameClass`) vì tên bảng là do server đặt, app không có
 * quyền suy ra. Ở đây ta làm việc ngược lại — **đọc** tiền tố của cái tên server
 * đã trả về để xếp nhóm. Không hề tự sinh tên nào, nên không phạm điều đó. Tên
 * không khớp tiền tố nào thì thành "other" và vẫn dùng được bình thường.
 */
export const RECORD_ACTION_KINDS: RecordActionKindInfo[] = [
  {
    kind: "danhGia",
    label: "Đánh giá",
    icon: "clipboard-outline",
    childClassPrefix: "DanhGia",
  },
  {
    kind: "kiemKe",
    label: "Kiểm kê",
    icon: "checkbox-outline",
    childClassPrefix: "KiemKe",
  },
  {
    kind: "baoHong",
    label: "Báo hỏng",
    icon: "warning-outline",
    childClassPrefix: "BaoHong",
  },
  {
    kind: "xacNhanViTri",
    label: "Xác nhận vị trí",
    icon: "location-outline",
    childClassPrefix: "XacNhanViTri",
  },
  {
    kind: "trungChuyen",
    label: "Trung chuyển",
    icon: "swap-horizontal-outline",
    childClassPrefix: "TrungChuyen",
  },
];

/**
 * Thứ tự ưu tiên khi một bản ghi làm được nhiều việc: việc nào lên làm nút chính
 * ở thanh đáy. Chế độ quét đang bật vẫn thắng thứ tự này — nút chính đi theo việc
 * người dùng đang làm hôm nay.
 */
export const PRIMARY_KIND_ORDER: RecordActionKind[] = [
  ...RECORD_ACTION_KINDS.map((info) => info.kind),
  "other",
];

const KIND_INFO_BY_KIND = new Map<NamedRecordActionKind, RecordActionKindInfo>(
  RECORD_ACTION_KINDS.map((info) => [info.kind, info]),
);

export const getRecordActionKindInfo = (kind?: RecordActionKind) =>
  kind && kind !== "other" ? KIND_INFO_BY_KIND.get(kind) : undefined;

/**
 * Loại việc của một class con, suy từ tiền tố tên class. `KiemKe_BinhChuaChay`
 * → "kiemKe". Không khớp gì → "other".
 */
export const getRecordActionKindForChildClass = (
  childNameClass?: string,
): RecordActionKind => {
  const prefix = (childNameClass || "").trim().split("_")[0]?.toLowerCase();
  if (!prefix) return "other";

  const matched = RECORD_ACTION_KINDS.find(
    (info) => info.childClassPrefix?.toLowerCase() === prefix,
  );

  return matched?.kind ?? "other";
};

/** So sánh để xếp hành động theo thứ tự ưu tiên. */
export const compareRecordActionKinds = (
  a: RecordActionKind,
  b: RecordActionKind,
) => {
  const indexOf = (kind: RecordActionKind) => {
    const index = PRIMARY_KIND_ORDER.indexOf(kind);
    return index === -1 ? PRIMARY_KIND_ORDER.length : index;
  };

  return indexOf(a) - indexOf(b);
};
