import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";

import type { AssetReturnTo, Field, StackNavigation } from "../../../../types";
import { usePermission } from "../../../../hooks/usePermission";
import { useSafeAlert } from "../../../../hooks/useSafeAlert";
import { useParams } from "../../../../hooks/useParams";
import { useScanMode } from "../../../../context/ScanModeContext";
import { useOpenAddRelatedForm } from "../../shared/useOpenAddRelatedForm";
import {
  pickPrimaryRecordAction,
  resolveRecordActions,
} from "./resolveRecordActions";
import type { RecordAction } from "./types";

type UseRecordActionsArgs = {
  fieldActive?: Field[];
  item: Record<string, any> | null | undefined;
  /** Màn danh sách bản ghi con của luồng đang đứng: QR có màn riêng. */
  listRoute?: "QrReview" | "AssetRelatedList";
  nameClass?: string;
  /** Nơi màn tạo quay về sau khi lưu, khi bấm từ màn chi tiết. */
  returnTo?: AssetReturnTo;
};

/**
 * Việc làm được với bản ghi đang mở, cho các màn chi tiết.
 *
 * Chỉ trả nhóm `work` (làm việc với thiết bị). Nhóm `admin` (Bản sao/Xóa) và các
 * việc chạy tại chỗ vẫn do `AssetDetailHeaderActions` tự dựng — cơ chế panel mở
 * tiếp và máy trạng thái GPS ở đó đang chạy tốt, không có lý do gom vào đây.
 */
export function useRecordActions({
  fieldActive,
  item,
  listRoute,
  nameClass,
  returnTo,
}: UseRecordActionsArgs) {
  const navigation = useNavigation<StackNavigation<"AssetDetails">>();
  const { can, loaded } = usePermission();
  const { isMounted } = useSafeAlert();
  const { mode } = useScanMode();
  const { groupMenuId, viewPermission, assetTitleHeader } = useParams();
  const { loadChildClasses, openAddForm } = useOpenAddRelatedForm();

  // `null` = chưa biết (chưa tải xong): nơi gọi chưa dựng gì, để khỏi loé một
  // thanh hành động rỗng rồi mới có nút.
  const [actions, setActions] = useState<RecordAction[] | null>(null);

  const itemId = item?.id;

  // Không đưa `fieldActive` vào deps của effect: nơi gọi truyền `fieldActive || []`
  // nên mảng là mới mỗi render, effect sẽ chạy vòng vô hạn. Nó chỉ dùng để suy ra
  // mã bản ghi cho nhãn, không phải căn cứ để tính lại danh sách việc.
  const fieldActiveRef = useRef(fieldActive);
  fieldActiveRef.current = fieldActive;

  const navigate = useCallback(
    (screen: string, params?: Record<string, any>) =>
      // Đích là hợp của nhiều route có params khác nhau hẳn nhau (danh sách con,
      // lịch sử tủ lạnh, wizard trung chuyển); kiểu hoá chính xác ở đây phải dựng
      // lại cả `RootStackParamList` trong `RecordAction`, không đáng.
      (navigation.navigate as (screen: string, params?: unknown) => void)(
        screen,
        params,
      ),
    [navigation],
  );

  useEffect(() => {
    let cancelled = false;
    setActions(null);

    // Quyền chưa nạp thì mọi `can` đều false — tính lúc này là ra danh sách rỗng
    // rồi ghim luôn, nên phải chờ.
    if (!item || !nameClass || !loaded) return;

    resolveRecordActions({
      assetContext: { assetTitleHeader, groupMenuId, viewPermission },
      can,
      fieldActive: fieldActiveRef.current,
      item,
      listRoute,
      loadChildClasses,
      nameClass,
      navigate,
      openAddForm,
      returnTo,
    })
      .then((result) => {
        if (!cancelled && isMounted()) setActions(result.actions);
      })
      .catch(() => {
        // `resolveRecordActions` đã tự nuốt lỗi tải danh mục con; tới đây là lỗi
        // ngoài dự tính, coi như không có việc nào.
        if (!cancelled) setActions([]);
      });

    return () => {
      cancelled = true;
    };
    // `can` được tạo mới mỗi lần render nên cố ý không đưa vào deps; `loaded` đổi
    // là đủ để tính lại sau khi quyền nạp xong. `item` cũng vậy — bám theo `itemId`
    // để không tính lại mỗi lần màn cha nạp lại bản ghi cùng id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assetTitleHeader,
    groupMenuId,
    itemId,
    listRoute,
    loadChildClasses,
    loaded,
    nameClass,
    navigate,
    openAddForm,
    returnTo,
    viewPermission,
  ]);

  const workActions = useMemo(
    () => actions?.filter((action) => action.group === "work") ?? null,
    [actions],
  );

  const primary = useMemo(
    () => (workActions ? pickPrimaryRecordAction(workActions, mode) : null),
    [mode, workActions],
  );

  return {
    /** `null` = chưa biết; `[]` = biết chắc không có việc nào. */
    actions: workActions,
    primary,
  };
}
