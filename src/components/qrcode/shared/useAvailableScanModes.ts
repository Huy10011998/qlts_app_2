import { useMemo } from "react";

import {
  RECORD_ACTION_KINDS,
  type RecordActionKindInfo,
} from "../../../constants/recordActionKinds";
import { useNoiDiaTuLanhPermissions } from "../../../screens/NoiDia/shared/useNoiDiaTuLanhPermissions";

/**
 * Chế độ quét mà người dùng thật sự chọn được.
 *
 * Chọn một chế độ nghĩa là "quét xong tạo luôn một bản ghi", nên cửa quyền ở đây
 * là `Insert` chứ không phải `Read` — người chỉ được xem lịch sử tủ lạnh thì
 * không nên thấy "Trung chuyển tủ lạnh" trong bảng chọn, bấm vào cũng không tạo
 * được gì.
 *
 * Loại đến từ bảng con (đánh giá) KHÔNG lọc được ở đây: quyền nằm trên class con
 * của bản ghi, mà chưa quét thì chưa biết mã sắp tới thuộc class nào. Trường hợp
 * đó để màn quét xử lý sau khi quét, và nói rõ lý do.
 */
export function useAvailableScanModes(): RecordActionKindInfo[] {
  const { canThemXacNhanViTri, canThemTrungChuyen } =
    useNoiDiaTuLanhPermissions();

  return useMemo(
    () =>
      RECORD_ACTION_KINDS.filter((info) => {
        if (info.kind === "xacNhanViTriTuLanh") return canThemXacNhanViTri;
        if (info.kind === "trungChuyenTuLanh") return canThemTrungChuyen;

        return true;
      }),
    [canThemTrungChuyen, canThemXacNhanViTri],
  );
}
