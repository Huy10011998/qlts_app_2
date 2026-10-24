import { useCallback } from "react";
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
import { usePermission } from "../../../hooks/usePermission";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import { getRecordLabel } from "../detailActions/useAssetRecordActions";
import { REVIEW_NAME_CLASSES_DANHGIA } from "../../../constants/reviewNameClasses";
import { isWorkflowOnlyClass } from "../../../screens/Workflow/shared/workflowRelated";

/** Ngữ cảnh menu/quyền của luồng tài sản, đi kèm suốt các màn con. */
export type AddRelatedAssetContext = {
  assetTitleHeader?: string;
  groupMenuId?: number;
  viewPermission?: string;
};

export type OpenAddFormArgs = {
  assetContext?: AddRelatedAssetContext;
  /** Class con sẽ tạo bản ghi. */
  childClass: MenuItemResponse;
  /** Bản ghi cha. */
  item: Record<string, any>;
  /** Field của class cha, chỉ dùng để suy ra mã bản ghi cha. */
  parentFieldActive?: Field[];
  parentNameClass?: string;
  returnTo?: "assetList" | "assetRelatedList" | "openAssetRelatedList" | "qrReview" | "qrScan";
};

/**
 * Danh mục con đã biết theo class cha, để ở cấp module chứ không phải ref của
 * từng hook: cùng một class được hỏi từ nhiều nơi (nút vuốt ở danh sách, thanh
 * hành động ở màn quét QR) nên giữ riêng theo instance là gọi lại mạng vô ích.
 * Chỉ giữ danh sách thô — phần lọc quyền phải tính lại mỗi lần vì quyền nạp xong
 * sau.
 *
 * Không tin nó suốt phiên: cấu hình class đổi được giữa chừng (BE ẩn Công việc /
 * Kế hoạch khỏi Nhân viên ngày 23/10/2026), nên mỗi lần dùng vẫn hỏi lại server.
 */
const childClassCache = new Map<string, MenuItemResponse[]>();
const childClassInFlight = new Map<string, Promise<MenuItemResponse[]>>();

/** Dọn cache — chỉ dùng cho test. */
export const resetChildClassCache = () => {
  childClassCache.clear();
  childClassInFlight.clear();
};

/**
 * Hỏi server, gộp với lượt đang chạy của cùng class. Các class con tạo được bằng
 * form chung; ném lỗi khi mạng/dữ liệu không ổn. Bỏ Công việc / Kế hoạch (con
 * của Nhân viên): BE chặn `insert` chung, chỉ tạo qua form Workflow — mà người
 * tạo luôn là người đăng nhập, không gắn được vào nhân viên đang xem.
 */
const fetchChildClasses = (nameClass: string): Promise<MenuItemResponse[]> => {
  const existing = childClassInFlight.get(nameClass);
  if (existing) return existing;

  const request = (async () => {
    const response = await getClassReference(nameClass);
    const data = response?.data;
    if (!Array.isArray(data)) throw new Error("Dữ liệu trả về không hợp lệ");

    const items: MenuItemResponse[] = data
      .filter((item: any) => !isWorkflowOnlyClass(item?.name))
      .map((item: any) => ({
        ...item,
        label: item.moTa ?? "Không có mô tả",
        icon: "document-text-outline",
        iconImageUri: normalizeIconImageUri(item.iconMobile),
      }));

    childClassCache.set(nameClass, items);
    return items;
  })().finally(() => {
    childClassInFlight.delete(nameClass);
  });

  childClassInFlight.set(nameClass, request);
  return request;
};

const isDanhGiaClass = (name?: string) =>
  REVIEW_NAME_CLASSES_DANHGIA.includes((name || "").trim());

/**
 * Nhãn của hành động thêm con. Biết chắc chỉ có một danh mục con thì gọi đúng
 * tên việc sẽ làm ("Đánh giá", "Thêm bảo trì"); nhiều danh mục hoặc chưa biết
 * thì để chung.
 *
 * Cố ý không dùng "Thêm mới" — đó là nhãn của FAB (thêm bản ghi cùng cấp), để
 * chung một chữ thì không phân biệt được hai việc.
 */
export const getAddChildLabel = (children: MenuItemResponse[] | null) => {
  const GENERIC_LABEL = "Thêm mục con";

  if (!children || children.length !== 1) return GENERIC_LABEL;

  const [child] = children;
  if (isDanhGiaClass(child.name)) return "Đánh giá";

  const moTa = (child.moTa || "").trim();
  return moTa ? `Thêm ${moTa.toLowerCase()}` : GENERIC_LABEL;
};

export const getAddChildIcon = (children: MenuItemResponse[] | null) =>
  children?.length === 1 && isDanhGiaClass(children[0].name)
    ? "clipboard-outline"
    : "add-circle-outline";

/**
 * Lõi dùng chung của mọi đường tắt "thêm bản ghi con": lấy danh mục con của một
 * class, lọc theo quyền `Insert`, rồi mở thẳng `AssetAddRelatedItem` với đủ
 * cấu hình của class con.
 *
 * Cấu hình cần cho màn tạo (field + propertyClass của class con) chỉ được tải
 * khi người dùng thực sự bấm.
 *
 * Hook này không tự báo lỗi: nơi gọi quyết định báo cho người dùng (nút vuốt ở
 * danh sách) hay im lặng đi đường khác (màn quét QR).
 */
export function useOpenAddRelatedForm() {
  const navigation = useNavigation<StackNavigation<"AssetList">>();
  const { can, loaded } = usePermission();
  const { isMounted } = useSafeAlert();

  /**
   * Danh mục con, không bắt chờ mạng khi đã biết: trả ngay số đã biết và hỏi lại
   * ngầm cho lượt sau (màn quét QR dựng thanh hành động từ đây — quét liên tục
   * mà mỗi mã chờ một request là chậm). Chưa biết thì chờ mạng, lỗi thì ném.
   */
  const loadChildClasses = useCallback(async (nameClass?: string) => {
    if (!nameClass) return [];

    const cached = childClassCache.get(nameClass);
    if (cached) {
      fetchChildClasses(nameClass).catch(() => undefined);
      return cached;
    }

    return fetchChildClasses(nameClass);
  }, []);

  /** Số đã biết, không gọi mạng; `null` = chưa hỏi lần nào. */
  const peekChildClasses = useCallback(
    (nameClass?: string) =>
      (nameClass ? childClassCache.get(nameClass) : undefined) ?? null,
    [],
  );

  /** Luôn hỏi server (gộp với lượt đang chạy) — để cập nhật thứ đang hiện. */
  const refreshChildClasses = useCallback(
    async (nameClass?: string) => (nameClass ? fetchChildClasses(nameClass) : []),
    [],
  );

  /** Lọc theo quyền `Insert`, không quan tâm quyền đã nạp xong hay chưa. */
  const filterByInsertPermission = useCallback(
    (items: MenuItemResponse[]) =>
      items.filter((child) => can(child.name, "Insert")),
    // `can` được tạo mới mỗi lần render nên cố ý không đưa vào deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Lọc theo quyền `Insert`; `null` khi quyền chưa nạp xong hoặc chưa có danh sách. */
  const filterInsertable = useCallback(
    (items: MenuItemResponse[] | null) => {
      if (!items || !loaded) return null;
      return filterByInsertPermission(items);
      // `loaded` đổi là đủ để tính lại sau khi quyền nạp xong.
    },
    [filterByInsertPermission, loaded],
  );

  /** Mở màn tạo bản ghi con. Ném lỗi nếu không tải được cấu hình class con. */
  const openAddForm = useCallback(
    async ({
      assetContext,
      childClass,
      item,
      parentFieldActive,
      parentNameClass,
      returnTo,
    }: OpenAddFormArgs) => {
      const [resField, resProp] = await Promise.all([
        getFieldActive(childClass.name),
        getPropertyClass(childClass.name),
      ]);

      const childFields: Field[] = resField?.data || [];
      const childPropertyClass: PropertyResponse | undefined = resProp?.data;

      if (!isMounted()) return false;

      navigation.navigate("AssetAddRelatedItem", {
        field: JSON.stringify(childFields),
        nameClass: childClass.name,
        propertyClass: mapPropertyResponseToPropertyClass(childPropertyClass),
        idRoot: String(item.id),
        nameClassRoot: parentNameClass,
        rootRecordLabel: getRecordLabel(item, parentFieldActive),
        propertyReference: childClass.propertyReference,
        titleHeader: childClass.moTa ?? "Thêm mới",
        returnTo,
        groupMenuId: assetContext?.groupMenuId,
        viewPermission: assetContext?.viewPermission,
        assetTitleHeader: assetContext?.assetTitleHeader,
      });

      return true;
    },
    [isMounted, navigation],
  );

  return {
    filterByInsertPermission,
    filterInsertable,
    loadChildClasses,
    peekChildClasses,
    refreshChildClasses,
    openAddForm,
    permissionLoaded: loaded,
  };
}
