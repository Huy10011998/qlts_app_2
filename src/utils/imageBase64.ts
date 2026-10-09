/**
 * Field ảnh lưu thẳng trong cột (`typeProperty = 12`), dạng
 * `data:image/jpeg;base64,...`. Khác hẳn field `Image` (9) — cột đó chỉ là
 * đường dẫn file, phải gọi API preview mới có ảnh.
 *
 * Chọn / cắt ảnh nằm ở `imageBase64Picker.ts` (kéo theo module native), file
 * này chỉ giữ hàm thuần để màn danh sách / chi tiết import nhẹ.
 */

/**
 * Chỉ chuỗi bắt đầu bằng `data:` mới là ảnh. Base64 trần (thiếu tiền tố) web
 * coi là đường dẫn file và hiện ảnh trống, nên app cũng coi là dữ liệu lỗi.
 */
export const isDataUrlImage = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

/** Ước lượng dung lượng ảnh từ độ dài chuỗi, đúng công thức web đang hiện. */
export const getBase64SizeKB = (value: string) =>
  Math.round((value.length * 3) / 4 / 1024);

/** Giá trị gửi lên server: không có ảnh là `null`, không gửi `""` hay `"---"`. */
export const toBase64FieldPayload = (value: unknown) =>
  isDataUrlImage(value) ? value : null;

/**
 * Field 12 `isReadOnly` mà JSON không có giá trị (vd `NhanVien.QRCode`) là cột
 * tính sẵn của web: server bỏ khỏi JSON cho nhẹ. Nếu dòng có `qrUrl` thì app tự
 * sinh QR từ link đó; không thì trả `""` — nơi gọi ẩn luôn dòng này.
 */
export const getComputedQrUrl = (
  item: Record<string, any> | null | undefined,
  field: { isReadOnly?: boolean | null },
  value: unknown,
) => {
  if (!field.isReadOnly || isDataUrlImage(value)) return "";
  const qrUrl = item?.qrUrl ?? item?.QrUrl ?? item?.QRUrl;
  return typeof qrUrl === "string" ? qrUrl.trim() : "";
};
