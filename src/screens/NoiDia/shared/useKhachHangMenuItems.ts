import { useCallback, useMemo } from "react";

import type { DetailMenuItem } from "../../../components/assets/detailActions/detailMenuTypes";
import { useAppDispatch } from "../../../store/hooks";
import {
  setShouldRefreshDetails,
  setUpdatedListItem,
} from "../../../store/AssetSlice";
import { KHACH_HANG_NAME_CLASS } from "../../../services/data/callApi";
import {
  getKhachHangToaDoLabel,
  toKhachHangSummary,
} from "./khachHangLookup";
import { useCapNhatToaDoKhachHang } from "./useCapNhatToaDoKhachHang";

/**
 * Mục nghiệp vụ khách hàng nội địa cho menu ⋯ của màn chi tiết.
 *
 * Chỉ có với class NoiDia_KhachHang — cập nhật toạ độ bằng GPS là nghiệp vụ
 * riêng của khách hàng nội địa. Trả mảng rỗng khi không áp dụng.
 */
export function useKhachHangMenuItems({
  nameClass,
  item,
}: {
  nameClass?: string;
  item: Record<string, any> | null;
}): DetailMenuItem[] {
  const dispatch = useAppDispatch();

  // Memo hoá: `toKhachHangSummary` tạo object mới mỗi lần gọi, không memo thì
  // mảng mục cũng mới theo mỗi render và menu sẽ setOptions lặp vô hạn.
  const khachHang = useMemo(
    () =>
      nameClass === KHACH_HANG_NAME_CLASS && item
        ? toKhachHangSummary(item)
        : null,
    [item, nameClass],
  );

  const handleSuccess = useCallback(() => {
    if (!khachHang) return;

    // Màn chi tiết tự refetch khi focus, danh sách refresh đúng dòng vừa sửa.
    dispatch(setShouldRefreshDetails(true));
    dispatch(
      setUpdatedListItem({
        id: String(khachHang.id),
        nameClass: KHACH_HANG_NAME_CLASS,
      }),
    );
  }, [dispatch, khachHang]);

  const { busyLabel, canUpdate, isBusy, start } = useCapNhatToaDoKhachHang({
    onSuccess: handleSuccess,
  });

  return useMemo(() => {
    if (!khachHang || !canUpdate) return [];

    return [
      {
        key: "khach-hang-cap-nhat-toa-do",
        label: busyLabel ?? "Cập nhật toạ độ",
        sublabel: isBusy ? "Vui lòng đợi" : getKhachHangToaDoLabel(khachHang),
        icon: "navigate-outline",
        disabled: isBusy,
        // Chạy tại chỗ và tự báo tiến độ bằng nhãn, nên giữ panel mở như trước.
        closeOnPress: false,
        onPress: () => start(khachHang),
      },
    ];
  }, [busyLabel, canUpdate, isBusy, khachHang, start]);
}
