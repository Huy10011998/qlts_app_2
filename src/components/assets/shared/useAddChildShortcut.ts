import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  getClassReference,
  getFieldActive,
  getPropertyClass,
} from "../../../services";
import type {
  Field,
  MenuItemResponse,
  PropertyResponse,
  StackNavigation,
} from "../../../types";
import { mapPropertyResponseToPropertyClass } from "../../../utils/helpers/propertyClass";
import { normalizeIconImageUri } from "../../../utils/iconImage";
import { isNetworkRequestError } from "../../../utils/helpers/api";
import { error } from "../../../utils/Logger";
import { usePermission } from "../../../hooks/usePermission";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import { getRecordLabel } from "../detailActions/useAssetRecordActions";
import { REVIEW_NAME_CLASSES_DANHGIA } from "../../../constants/reviewNameClasses";

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

const isDanhGiaClass = (name?: string) =>
  REVIEW_NAME_CLASSES_DANHGIA.includes((name || "").trim());

/**
 * Nhãn nút vuốt. Biết chắc chỉ có một danh mục con thì gọi đúng tên việc sẽ
 * làm ("Đánh giá", "Thêm bảo trì"); nhiều danh mục hoặc chưa biết thì để chung.
 */
const getActionLabel = (children: MenuItemResponse[] | null) => {
  // Cố ý không dùng "Thêm mới" — đó là nhãn của FAB (thêm bản ghi cha), để
  // chung một chữ thì không phân biệt được hai việc.
  const GENERIC_LABEL = "Thêm mục con";

  if (!children || children.length !== 1) return GENERIC_LABEL;

  const [child] = children;
  if (isDanhGiaClass(child.name)) return "Đánh giá";

  const moTa = (child.moTa || "").trim();
  return moTa ? `Thêm ${moTa.toLowerCase()}` : GENERIC_LABEL;
};

const getActionIcon = (children: MenuItemResponse[] | null) =>
  children?.length === 1 && isDanhGiaClass(children[0].name)
    ? "clipboard-outline"
    : "add-circle-outline";

/**
 * Đường tắt "thêm bản ghi con" từ ngay danh sách cha: bỏ qua chặng
 * AssetDetails → tab Chi tiết → AssetRelatedList, vào thẳng `AssetAddRelatedItem`.
 *
 * Cấu hình cần cho màn tạo (field + propertyClass của class con) chỉ được tải
 * khi người dùng thực sự bấm, và danh sách class con được cache theo class cha
 * nên chỉ gọi mạng lần đầu.
 */
export function useAddChildShortcut({
  assetTitleHeader,
  fieldActive,
  groupMenuId,
  nameClass,
  viewPermission,
}: UseAddChildShortcutParams) {
  const navigation = useNavigation<StackNavigation<"AssetList">>();
  const { can, loaded } = usePermission();
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
  const referenceCacheRef = useRef<Record<string, MenuItemResponse[]>>({});

  const loadChildClasses = useCallback(async () => {
    if (!nameClass) return [];

    const cached = referenceCacheRef.current[nameClass];
    if (cached) return cached;

    const response = await getClassReference(nameClass);
    const data = response?.data;
    if (!Array.isArray(data)) throw new Error("Dữ liệu trả về không hợp lệ");

    const items: MenuItemResponse[] = data.map((item: any) => ({
      ...item,
      label: item.moTa ?? "Không có mô tả",
      icon: "document-text-outline",
      iconImageUri: normalizeIconImageUri(item.iconMobile),
    }));

    referenceCacheRef.current[nameClass] = items;
    return items;
  }, [nameClass]);

  // Tải trước danh mục con để nhãn nút vuốt gọi đúng tên việc ("Đánh giá",
  // "Thêm bảo trì") và ẩn nút khi không có gì để thêm — đồng thời lần bấm đầu
  // không phải chờ mạng nữa.
  useEffect(() => {
    let cancelled = false;
    setChildClasses(null);

    if (!nameClass) return;

    loadChildClasses()
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
  const allowedChildClasses = useMemo(() => {
    if (!childClasses || !loaded) return null;
    return childClasses.filter((child) => can(child.name, "Insert"));
    // `can` được tạo mới mỗi lần render nên cố ý không đưa vào deps; `loaded`
    // đổi là đủ để tính lại sau khi quyền nạp xong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childClasses, loaded]);

  const goToAddRelated = useCallback(
    async (item: Record<string, any>, childClass: MenuItemResponse) => {
      setBusyItemId(String(item.id));
      try {
        const [resField, resProp] = await Promise.all([
          getFieldActive(childClass.name),
          getPropertyClass(childClass.name),
        ]);

        const childFields: Field[] = resField?.data || [];
        const childPropertyClass: PropertyResponse | undefined = resProp?.data;

        if (!isMounted()) return;

        navigation.navigate("AssetAddRelatedItem", {
          field: JSON.stringify(childFields),
          nameClass: childClass.name,
          propertyClass: mapPropertyResponseToPropertyClass(childPropertyClass),
          idRoot: String(item.id),
          nameClassRoot: nameClass,
          rootRecordLabel: getRecordLabel(item, fieldActive),
          propertyReference: childClass.propertyReference,
          titleHeader: childClass.moTa ?? "Thêm mới",
          // Lưu xong mở danh sách con để thấy ngay bản ghi vừa tạo; danh sách
          // cha vẫn nằm dưới stack nên bấm back là về đúng chỗ vừa vuốt.
          returnTo: "openAssetRelatedList",
          groupMenuId,
          viewPermission,
          assetTitleHeader,
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
      navigation,
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
          const items = await loadChildClasses();
          if (isMounted()) setChildClasses(items);
          allowed = items.filter((child) => can(child.name, "Insert"));
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
      can,
      fieldActive,
      goToAddRelated,
      isMounted,
      loadChildClasses,
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
    actionIcon: getActionIcon(allowedChildClasses),
    actionLabel: getActionLabel(allowedChildClasses),
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
