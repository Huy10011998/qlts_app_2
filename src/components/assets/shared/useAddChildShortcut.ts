import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Field, MenuItemResponse } from "../../../types";
import { isNetworkRequestError } from "../../../utils/helpers/api";
import { error } from "../../../utils/Logger";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import { getRecordLabel } from "../detailActions/useAssetRecordActions";
import {
  getAddChildIcon,
  getAddChildLabel,
  useOpenAddRelatedForm,
} from "./useOpenAddRelatedForm";

type UseAddChildShortcutParams = {
  assetTitleHeader?: string;
  /** Field của class cha, dùng để suy ra mã bản ghi cha. */
  fieldActive: Field[];
  groupMenuId?: number;
  nameClass?: string;
  viewPermission?: string;
};

const NETWORK_MESSAGE =
  "Vui lòng kiểm tra kết nối mạng rồi thử lại.";

/**
 * Đường tắt "thêm bản ghi con" từ ngay danh sách cha: bỏ qua chặng
 * AssetDetails → tab Chi tiết → AssetRelatedList, vào thẳng `AssetAddRelatedItem`.
 *
 * Đây là lớp state UI của nút vuốt; phần tải danh mục con và mở màn tạo nằm ở
 * `useOpenAddRelatedForm` để thanh hành động ở màn chi tiết và màn quét QR dùng
 * chung cùng một lõi.
 */
export function useAddChildShortcut({
  assetTitleHeader,
  fieldActive,
  groupMenuId,
  nameClass,
  viewPermission,
}: UseAddChildShortcutParams) {
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const {
    filterByInsertPermission,
    filterInsertable,
    loadChildClasses,
    openAddForm,
  } = useOpenAddRelatedForm();

  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  // `null` = chưa biết (chưa tải xong / tải lỗi): vẫn cho bấm, nhãn để chung.
  const [childClasses, setChildClasses] = useState<MenuItemResponse[] | null>(
    null,
  );
  const [sheetItems, setSheetItems] = useState<MenuItemResponse[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetRecordLabel, setSheetRecordLabel] = useState<string>("");

  // Bản ghi cha đang chờ chọn danh mục con.
  const pendingItemRef = useRef<Record<string, any> | null>(null);

  // Tải trước danh mục con để nhãn nút vuốt gọi đúng tên việc ("Đánh giá",
  // "Thêm bảo trì") và ẩn nút khi không có gì để thêm — đồng thời lần bấm đầu
  // không phải chờ mạng nữa.
  useEffect(() => {
    let cancelled = false;
    setChildClasses(null);

    if (!nameClass) return;

    loadChildClasses(nameClass)
      .then((items) => {
        if (!cancelled) setChildClasses(items);
      })
      .catch((e) => {
        // Lỗi ở đây là im lặng: nút vẫn hiện với nhãn chung, bấm vào sẽ thử lại
        // và báo lỗi tử tế nếu vẫn không được.
        if (!isNetworkRequestError(e)) error(e);
      });

    return () => {
      cancelled = true;
    };
    // Cờ `cancelled` đã lo phần unmount; không lấy `isMounted` làm dependency
    // để effect không chạy lại theo từng lần render của nơi gọi.
  }, [loadChildClasses, nameClass]);

  /** Danh mục con mà người dùng có quyền thêm; `null` khi chưa biết. */
  const allowedChildClasses = useMemo(
    () => filterInsertable(childClasses),
    [childClasses, filterInsertable],
  );

  const goToAddRelated = useCallback(
    async (item: Record<string, any>, childClass: MenuItemResponse) => {
      setBusyItemId(String(item.id));
      try {
        await openAddForm({
          assetContext: { assetTitleHeader, groupMenuId, viewPermission },
          childClass,
          item,
          parentFieldActive: fieldActive,
          parentNameClass: nameClass,
          // Lưu xong mở danh sách con để thấy ngay bản ghi vừa tạo; danh sách
          // cha vẫn nằm dưới stack nên bấm back là về đúng chỗ vừa vuốt.
          returnTo: "openAssetRelatedList",
        });
      } catch (e) {
        if (!isNetworkRequestError(e)) error(e);
        showAlertIfActive(
          "Lỗi",
          `Không thể mở màn thêm mới cho ${childClass.label}. ${NETWORK_MESSAGE}`,
        );
      } finally {
        if (isMounted()) setBusyItemId(null);
      }
    },
    [
      assetTitleHeader,
      fieldActive,
      groupMenuId,
      isMounted,
      nameClass,
      openAddForm,
      showAlertIfActive,
      viewPermission,
    ],
  );

  /** Người dùng bấm nút vuốt trên một dòng của danh sách cha. */
  const openFor = useCallback(
    async (item: Record<string, any>) => {
      if (busyItemId) return;

      let allowed = allowedChildClasses;

      if (!allowed) {
        // Prefetch chưa xong hoặc lỗi: tải tại đây, lần này báo lỗi cho người dùng.
        setBusyItemId(String(item.id));
        try {
          const items = await loadChildClasses(nameClass);
          if (isMounted()) setChildClasses(items);
          allowed = filterByInsertPermission(items);
        } catch (e) {
          if (!isNetworkRequestError(e)) error(e);
          showAlertIfActive(
            "Lỗi",
            `Không thể tải danh mục con. ${NETWORK_MESSAGE}`,
          );
          if (isMounted()) setBusyItemId(null);
          return;
        }
      }

      if (!isMounted()) return;
      setBusyItemId(null);

      if (allowed.length === 0) {
        showAlertIfActive(
          "Thông báo",
          "Bản ghi này không có danh mục con nào bạn được thêm.",
        );
        return;
      }

      if (allowed.length === 1) {
        goToAddRelated(item, allowed[0]);
        return;
      }

      pendingItemRef.current = item;
      setSheetItems(allowed);
      setSheetRecordLabel(getRecordLabel(item, fieldActive));
      setSheetVisible(true);
    },
    [
      allowedChildClasses,
      busyItemId,
      fieldActive,
      filterByInsertPermission,
      goToAddRelated,
      isMounted,
      loadChildClasses,
      nameClass,
      showAlertIfActive,
    ],
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    pendingItemRef.current = null;
  }, []);

  const selectChildClass = useCallback(
    (childClass: MenuItemResponse) => {
      const item = pendingItemRef.current;
      setSheetVisible(false);
      pendingItemRef.current = null;
      if (item) goToAddRelated(item, childClass);
    },
    [goToAddRelated],
  );

  return {
    actionIcon: getAddChildIcon(allowedChildClasses),
    actionLabel: getAddChildLabel(allowedChildClasses),
    busyItemId,
    // Biết chắc không có danh mục con nào được thêm thì ẩn hẳn nút vuốt.
    canAddChild: allowedChildClasses === null || allowedChildClasses.length > 0,
    /**
     * Chỉ đúng khi đã tải xong và thật sự có danh mục con. Dải chỉ dẫn dùng cờ
     * này chứ không dùng `canAddChild`: lúc chưa biết mà đã hiện thì ở class
     * không có mục con nào, dòng nhắc sẽ loé lên rồi mất.
     */
    hasChildClasses: (allowedChildClasses?.length ?? 0) > 0,
    openFor,
    sheetProps: {
      items: sheetItems,
      onClose: closeSheet,
      onSelect: selectChildClass,
      recordLabel: sheetRecordLabel,
      visible: sheetVisible,
    },
  };
}
