import type { MenuItemResponse } from "../../../../types";
import { getChildClassActionKind } from "../../../../constants/recordActionKinds";
import {
  getAddChildIcon,
  getAddChildLabel,
  type OpenAddFormArgs,
} from "../../shared/useOpenAddRelatedForm";
import { getRecordLabel } from "../useAssetRecordActions";
import type { RecordAction, RecordActionBuilderContext } from "./types";

type BuildChildClassActionsArgs = RecordActionBuilderContext & {
  /** Class con đã lọc theo quyền `Insert`. */
  childClasses: MenuItemResponse[];
  navigate: (screen: string, params?: Record<string, any>) => void;
  openAddForm: (args: OpenAddFormArgs) => Promise<boolean> | void;
};

/**
 * Việc tạo bản ghi con — nguồn động, server quyết định có những gì.
 *
 * Đây là loại việc KHÔNG cần khai báo gì trong app: BE thêm một bảng con là nó tự
 * hiện ra. Bảng `recordActionKinds` chỉ dùng để đặt tên/icon cho những loại app
 * muốn cho chọn làm chế độ quét; class con lạ vẫn thành một việc dùng được bình
 * thường, chỉ mang `kind: "other"`.
 */
export function buildChildClassActions({
  assetContext,
  childClasses,
  fieldActive,
  item,
  listRoute,
  nameClass,
  navigate,
  openAddForm,
  returnTo,
}: BuildChildClassActionsArgs): RecordAction[] {
  const idRoot = String(item.id);

  return childClasses.map((childClass) => {
    const label = getAddChildLabel([childClass]);

    return {
      key: `child:${childClass.name}`,
      kind: getChildClassActionKind(childClass.name),
      // Nhãn và icon suy từ chính class con ("Đánh giá", "Thêm bảo trì") — không
      // còn bảng nào đặt tên sẵn cho từng loại việc nữa.
      label,
      icon: getAddChildIcon([childClass]),
      group: "work",
      // Danh sách truyền vào đây đã lọc `Insert` của chính class con, mà cả hai
      // đường (bấm ở màn chi tiết / quét liên tục) đều mở cùng một màn tạo.
      canQuickRun: true,
      run: async ({ quick }) => {
        await openAddForm({
          assetContext,
          childClass,
          item,
          parentFieldActive: fieldActive,
          parentNameClass: nameClass,
          // Quét liên tục thì lưu xong về thẳng máy quét để quét mã kế tiếp.
          returnTo: quick ? "qrScan" : returnTo,
        });
      },
      review:
        listRoute && childClass.propertyReference
          ? {
              label: `Lịch sử ${label.toLowerCase()}`,
              count: {
                idRoot,
                nameClass: childClass.name,
                propertyReference: childClass.propertyReference,
              },
              run: () =>
                navigate(listRoute, {
                  nameClass: childClass.name,
                  propertyReference: childClass.propertyReference,
                  idRoot,
                  nameClassRoot: nameClass,
                  titleHeader: childClass.moTa ?? "Danh sách",
                  ...(listRoute === "AssetRelatedList"
                    ? {
                        // Pill mã bản ghi cha trên header màn danh sách con.
                        rootRecordLabel: getRecordLabel(item, fieldActive),
                        groupMenuId: assetContext?.groupMenuId,
                        viewPermission: assetContext?.viewPermission,
                        assetTitleHeader: assetContext?.assetTitleHeader,
                      }
                    : {}),
                }),
            }
          : undefined,
    };
  });
}
