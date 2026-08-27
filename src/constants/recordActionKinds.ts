/**
 * "Loại việc" của một hành động — thứ duy nhất cần để nhớ chế độ quét: người dùng
 * chọn "Đánh giá" trên bình BCC-014 thì lần quét sau, ở bình BCC-015, app phải
 * nhận ra việc tương ứng dù đó là bản ghi của class con khác.
 *
 * KHÔNG có bảng liệt kê sẵn. Trước đây app phải khai trước từng loại việc để bảng
 * chọn chế độ có gì mà hiện, nên loại nào chưa khai là chưa chọn được — và khai
 * cho nghiệp vụ BE chưa ship thì thành đoán tên bảng. Giờ danh sách việc lấy thẳng
 * từ tài sản vừa quét, nên loại việc chỉ cần suy ra được, không cần liệt kê.
 *
 * Nhãn và icon cũng không nằm ở đây: hành động tự mang theo nhãn của nó (moTa của
 * class con, hoặc nhãn cứng của màn riêng), và chế độ quét nhớ luôn nhãn lúc được
 * chọn để pill hiện đúng chữ kể cả khi chưa quét gì.
 */
export type RecordActionKind = string;

/** Việc chưa xếp được vào loại nào — vẫn dùng được, chỉ không nhớ làm chế độ quét. */
export const UNKNOWN_RECORD_ACTION_KIND = "other";

/**
 * Loại việc của một class con, suy từ tiền tố tên class server trả về:
 * `KiemKe_BinhChuaChay` và `KiemKe_HongChuaChay` cùng ra `child:kiemke`, nên chọn
 * "Kiểm kê" ở loại thiết bị này thì quét loại thiết bị kia vẫn khớp.
 *
 * Đây là ĐỌC tiền tố của cái tên server đã trả về để xếp nhóm, khác hẳn việc TỰ
 * NỐI `"DanhGia_" + nameClass` mà `reviewNameClasses.ts` cấm — chỗ đó cấm app bịa
 * ra một tên class chưa chắc tồn tại.
 *
 * Không có `_` thì cả tên là tiền tố; class con nào không theo quy ước đặt tên vẫn
 * ra một loại riêng, chỉ là loại đó chỉ khớp với chính nó.
 */
export const getChildClassActionKind = (childNameClass?: string) => {
  const prefix = (childNameClass || "").trim().split("_")[0]?.toLowerCase();

  return prefix ? `child:${prefix}` : UNKNOWN_RECORD_ACTION_KIND;
};

/**
 * Nghiệp vụ có màn riêng trong app tự khai loại của mình. Tiền tố `fridge:` giữ
 * chúng tách khỏi bảng con: sau này BE trả `TrungChuyen_TaiSan` thì loại đó là
 * `child:trungchuyen`, KHÔNG đụng vào `fridge:trungchuyen` — trung chuyển tài sản
 * và trung chuyển tủ lạnh là hai nghiệp vụ khác nhau, gộp là chạy sai việc.
 */
export const FRIDGE_XAC_NHAN_VI_TRI_KIND = "fridge:xacnhanvitri";
export const FRIDGE_TRUNG_CHUYEN_KIND = "fridge:trungchuyen";
