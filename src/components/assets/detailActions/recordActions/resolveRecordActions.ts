import type { MenuItemResponse } from "../../../../types";
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

  // Giữ nguyên thứ tự server trả về danh mục con, nghiệp vụ riêng của app xếp sau.
  // Không còn bảng ưu tiên nào để sắp lại — mà cũng không nên có: thứ tự "việc nào
  // quan trọng hơn" là chuyện của cấu hình class, không phải của app.
  return { actions, childClassesFailed };
}

/**
 * Việc nào lên làm nút chính ở thanh đáy — chỉ khi bản ghi làm được đúng một việc.
 *
 * Nhiều việc thì trả `null` và nơi gọi mở bảng chọn. Không có bảng ưu tiên nào
 * trong app để xếp việc nào quan trọng hơn: thứ tự đó là chuyện của cấu hình class,
 * đoán sai thì người dùng bấm nhầm việc.
 */
export function pickPrimaryRecordAction(
  actions: RecordAction[],
): RecordAction | null {
  const workActions = actions.filter(
    (action) => action.group === "work" && !action.inPlace,
  );

  return workActions.length === 1 ? workActions[0] : null;
}
