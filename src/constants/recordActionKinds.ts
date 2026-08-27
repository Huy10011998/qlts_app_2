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
  | "xacNhanViTriTuLanh"
  | "trungChuyenTuLanh"
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
 * CHỈ khai loại việc đã chạy được thật. Kiểm kê và báo hỏng chưa có bảng nào trên
 * server nên chưa nằm ở đây: bày ra mà quét gì cũng báo "thiết bị này không có mục
 * kiểm kê" thì đúng lỗi đã sửa ở menu ⋯ — một lựa chọn ai bấm cũng không ra gì.
 * Khi BE ship thì thêm lại một dòng, `__tests__/recordActionKinds.test.ts` có sẵn
 * ca kiểm tiền tố lạ để biết chỗ nối vẫn đúng.
 *
 * KHÁC BIỆT quan trọng với `reviewNameClasses.ts`: chỗ đó cấm **tự nối** tên
 * class (`"DanhGia_" + nameClass`) vì tên bảng là do server đặt, app không có
 * quyền suy ra. Ở đây ta làm việc ngược lại — **đọc** tiền tố của cái tên server
 * đã trả về để xếp nhóm. Không hề tự sinh tên nào, nên không phạm điều đó. Tên
 * không khớp tiền tố nào thì thành "other" và vẫn dùng được bình thường.
 */
export const RECORD_ACTION_KINDS: RecordActionKindInfo[] = [
  // Bảng con `DanhGia_*` — nguồn duy nhất đã thấy server trả về, nên cũng là tiền
  // tố duy nhất được khai ở đây. Khai tiền tố cho bảng chưa tồn tại là đoán cách
  // BE đặt tên, đoán sai thì chế độ quét không bao giờ khớp mà chẳng ai biết vì sao.
  {
    kind: "danhGia",
    label: "Đánh giá",
    icon: "clipboard-outline",
    childClassPrefix: "DanhGia",
  },
  // Hai nghiệp vụ tủ lạnh: có màn riêng trong app, không phải bảng con, nên KHÔNG
  // khai `childClassPrefix` — builder của chúng tự gắn `kind`.
  //
  // Nhãn nói rõ "tủ lạnh" vì chúng chỉ áp dụng cho `NoiDia_TuLanh`. Trung chuyển
  // tài sản là nghiệp vụ KHÁC: class quyền khác, màn khác, luồng khác — khi nào có
  // thì thêm `trungChuyenTaiSan` thành một loại riêng, đừng dùng lại loại tủ lạnh,
  // không thì chọn "Trung chuyển" ở màn quét sẽ ra sai nghiệp vụ.
  {
    kind: "xacNhanViTriTuLanh",
    label: "Xác nhận vị trí tủ lạnh",
    icon: "location-outline",
  },
  {
    kind: "trungChuyenTuLanh",
    label: "Trung chuyển tủ lạnh",
    icon: "swap-horizontal-outline",
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
