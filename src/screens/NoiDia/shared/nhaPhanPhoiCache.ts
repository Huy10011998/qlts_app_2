import {
  getTrungChuyenNhaPhanPhoi,
  type NhaPhanPhoiItem,
} from "../../../services/data/callApi";

let cachedNhaPhanPhoi: NhaPhanPhoiItem[] | null = null;

/**
 * Danh sách NPP cỡ trăm dòng và gần như không đổi trong một ca làm việc, nên
 * giữ lại trong phiên thay vì gọi lại mỗi lần vào màn chọn.
 */
export const loadNhaPhanPhoi = async (forceReload = false) => {
  if (!forceReload && cachedNhaPhanPhoi) return cachedNhaPhanPhoi;

  const response = await getTrungChuyenNhaPhanPhoi();
  cachedNhaPhanPhoi = Array.isArray(response?.data) ? response.data : [];

  return cachedNhaPhanPhoi;
};
