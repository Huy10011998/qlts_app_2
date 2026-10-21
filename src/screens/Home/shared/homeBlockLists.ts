import { isHomeBlockKey, type HomeBlockKey } from "./homeBlockOrder";

/**
 * Hai danh sách khối Trang chủ lưu theo từng tài khoản. Cùng một hình dạng (mảng
 * mã khối) nên dùng chung cách đọc / ghi:
 * - Khối đang THU GỌN: user chạm nhãn màu, khối chỉ còn dòng tiêu đề.
 * - Khối đang ẨN: user bỏ chọn khối trong bảng Sắp xếp, khối biến hẳn khỏi Trang
 *   chủ (và khỏi hàng chip đi tới khối).
 */
export const HOME_COLLAPSED_BLOCKS_KEY = "@home:collapsedBlocks";
export const HOME_HIDDEN_BLOCKS_KEY = "@home:hiddenBlocks";

/** Key riêng cho từng username; chưa biết user thì dùng key chung. */
export const getHomeBlockListKey = (
  baseKey: string,
  userName: string | null,
) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return baseKey;

  return `${baseKey}:user:${encodeURIComponent(normalizedUserName)}`;
};

/** Lọc rác trong dữ liệu đã lưu: khối lạ (đã bị bỏ ở bản sau) và khối lặp. */
export const normalizeHomeBlockList = (value: unknown): HomeBlockKey[] => {
  if (!Array.isArray(value)) return [];

  const keys: HomeBlockKey[] = [];

  value.forEach((key) => {
    if (typeof key !== "string" || !isHomeBlockKey(key)) return;
    if (keys.includes(key)) return;

    keys.push(key);
  });

  return keys;
};

/** Trả lại đúng mảng cũ khi không đổi gì, để nơi gọi khỏi ghi máy vô ích. */
export const setHomeBlockInList = (
  list: HomeBlockKey[],
  key: HomeBlockKey,
  included: boolean,
): HomeBlockKey[] => {
  if (list.includes(key) === included) return list;

  return included ? [...list, key] : list.filter((item) => item !== key);
};
