import type { MenuItemResponse } from "../../../../types";
import {
  compareRecordActionKinds,
  type RecordActionKind,
} from "../../../../constants/recordActionKinds";
import { isNetworkRequestError } from "../../../../utils/helpers/api";
import { error } from "../../../../utils/Logger";
import type { OpenAddFormArgs } from "../../shared/useOpenAddRelatedForm";
import { buildChildClassActions } from "./childClassActions";
import { buildFridgeActions } from "./fridgeActions";
import type { RecordAction, RecordActionBuilderContext } from "./types";

export type ResolveRecordActionsContext = RecordActionBuilderContext & {
  can: (nameClass: string, action: string) => boolean;
  loadChildClasses: (nameClass?: string) => Promise<MenuItemResponse[]>;
  navigate: (screen: string, params?: Record<string, any>) => void;
  openAddForm: (args: OpenAddFormArgs) => Promise<boolean> | void;
};

export type ResolveRecordActionsResult = {
  actions: RecordAction[];
  /**
   * Không tải được danh mục con (thường là mạng). Các việc có màn riêng vẫn dùng
   * được, nên nơi gọi cần biết đây là "chưa đủ" chứ không phải "không có".
   */
  childClassesFailed: boolean;
};

/**
 * Toàn bộ việc làm được với một bản ghi, gộp từ mọi nguồn.
 *
 * Là hàm async thường, KHÔNG phải hook — `onCodeScanned` của màn quét không gọi
 * hook được, mà nó cần đúng danh sách này để biết chế độ quét đang bật có làm
 * được gì với thiết bị vừa quét hay không. Đó là lý do các builder được viết
 * thuần và tách khỏi hook.
 */
export async function resolveRecordActions(
  ctx: ResolveRecordActionsContext,
): Promise<ResolveRecordActionsResult> {
  const {
    can,
    item,
    loadChildClasses,
    nameClass,
    navigate,
    openAddForm,
    ...builderContext
  } = ctx;

  let childClasses: MenuItemResponse[] = [];
  let childClassesFailed = false;

  try {
    const all = await loadChildClasses(nameClass);
    childClasses = all.filter((child) => can(child.name, "Insert"));
  } catch (e) {
    if (!isNetworkRequestError(e)) error("Tải danh mục con lỗi:", e);
    childClassesFailed = true;
  }

  const actions = [
    ...buildChildClassActions({
      ...builderContext,
      childClasses,
      item,
      nameClass,
      navigate,
      openAddForm,
    }),
    ...buildFridgeActions({ can, item, nameClass, navigate }),
  ];

  // Sort ổn định (ES2019) nên các việc cùng loại giữ nguyên thứ tự server trả về.
  actions.sort((a, b) => compareRecordActionKinds(a.kind, b.kind));

  return { actions, childClassesFailed };
}

/**
 * Việc nào lên làm nút chính ở thanh đáy.
 *
 * Chế độ quét đang bật thắng thứ tự mặc định: người dùng đang đi kiểm kê thì nút
 * chính của mọi thiết bị nên là "Kiểm kê", dù bảng ưu tiên xếp đánh giá trước.
 *
 * Trả `null` khi có nhiều việc mà không có căn cứ nào để chọn — lúc đó nút chính
 * mở luôn bảng chọn thay vì đoán bừa.
 */
export function pickPrimaryRecordAction(
  actions: RecordAction[],
  scanMode?: RecordActionKind | "view",
): RecordAction | null {
  const workActions = actions.filter(
    (action) => action.group === "work" && !action.inPlace,
  );

  if (workActions.length === 0) return null;

  if (scanMode && scanMode !== "view") {
    const matchedMode = workActions.find((action) => action.kind === scanMode);
    if (matchedMode) return matchedMode;
  }

  const named = workActions.find((action) => action.kind !== "other");
  if (named) return named;

  return workActions.length === 1 ? workActions[0] : null;
}
