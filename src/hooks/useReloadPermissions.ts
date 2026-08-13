import { useCallback } from "react";

import { useAppDispatch } from "../store/hooks";
import { reloadPermissions } from "../store/PermissionActions";

/**
 * Nạp lại quyền theo yêu cầu — dùng cho các luồng người dùng chủ động làm mới
 * (kéo reload, bấm "Thử lại").
 *
 * Quyền nằm trong store và chỉ được nạp lúc đăng nhập hoặc lúc màn focus, nên
 * quyền vừa cấp trên web không tự về app. Người dùng đã kéo reload thì mong đợi
 * mọi thứ trên màn mới lại, gồm cả những nút bị ẩn vì thiếu quyền.
 *
 * Trả về hàm `Promise<boolean>` (false khi lỗi mạng — quyền cũ được giữ), gọi
 * kèm trong `Promise.all` với lượt tải dữ liệu của màn.
 */
export function useReloadPermissions() {
  const dispatch = useAppDispatch();

  return useCallback(() => dispatch(reloadPermissions()), [dispatch]);
}
