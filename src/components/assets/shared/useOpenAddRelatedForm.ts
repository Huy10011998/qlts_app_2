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
import {
  getDanhGiaNameClass,
  REVIEW_NAME_CLASSES_DANHGIA,
} from "../../../constants/reviewNameClasses";

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
 * Cache theo class cha, để ở cấp module chứ không phải ref của từng hook: cùng
 * một class con được hỏi từ nhiều nơi (nút vuốt ở danh sách, thanh hành động ở
 * màn chi tiết, màn quét QR) nên cache riêng theo instance là gọi lại mạng vô
 * ích. Chỉ cache danh sách thô — phần lọc quyền phải tính lại mỗi lần vì quyền
 * nạp xong sau.
 */
const childClassCache = new Map<string, MenuItemResponse[]>();

/**
 * Dọn cache — chỉ dùng cho test. Trong app cấu hình class không đổi giữa các lần
 * dùng nên không có chỗ nào phải gọi.
 */
export const resetChildClassCache = () => childClassCache.clear();

export const isDanhGiaClass = (name?: string) =>
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

  /** Danh sách thô các class con; ném lỗi khi mạng/dữ liệu không ổn. */
  const loadChildClasses = useCallback(async (nameClass?: string) => {
    if (!nameClass) return [];

    const cached = childClassCache.get(nameClass);
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

    childClassCache.set(nameClass, items);
    return items;
  }, []);

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

  /** Vừa tải vừa lọc quyền — dùng khi cần kết quả ngay lúc người dùng bấm. */
  const resolveChildClasses = useCallback(
    async (nameClass?: string) =>
      filterByInsertPermission(await loadChildClasses(nameClass)),
    [filterByInsertPermission, loadChildClasses],
  );

  /**
   * Danh mục con đóng vai "hành động chính" của bản ghi cha: ưu tiên đúng class
   * đánh giá của loại thiết bị (bảng đánh giá do server đặt tên, tra qua
   * `getDanhGiaNameClass` chứ không tự nối chuỗi), sau đó mới đến trường hợp chỉ
   * có duy nhất một danh mục con. Nhiều danh mục mà không có đánh giá thì trả
   * `null` để nơi gọi mở sheet cho người dùng chọn.
   */
  const pickPrimaryChildClass = useCallback(
    (parentNameClass?: string, children?: MenuItemResponse[] | null) => {
      if (!children || children.length === 0) return null;

      const danhGiaNameClass = getDanhGiaNameClass(parentNameClass);
      const danhGia = danhGiaNameClass
        ? children.find((child) => child.name === danhGiaNameClass)
        : undefined;
      if (danhGia) return danhGia;

      return children.length === 1 ? children[0] : null;
    },
    [],
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
    openAddForm,
    permissionLoaded: loaded,
    pickPrimaryChildClass,
    resolveChildClasses,
  };
}
