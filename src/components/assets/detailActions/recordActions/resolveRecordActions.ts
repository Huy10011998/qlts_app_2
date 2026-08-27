import type { MenuItemResponse } from "../../../../types";
import type { RecordActionKind } from "../../../../constants/recordActionKinds";
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
 * Việc nào lên làm nút chính ở thanh đáy.
 *
 * Chỉ hai căn cứ, đều chắc chắn: việc người dùng đang làm hôm nay (chế độ quét
 * đang nhớ), hoặc bản ghi chỉ làm được đúng một việc.
 *
 * Nhiều việc mà không có căn cứ nào thì trả `null` — nút chính mở luôn bảng chọn.
 * Trước đây chỗ này ưu tiên đánh giá theo một bảng cứng trong app; bỏ đi vì thứ tự
 * đó là do app tự đặt chứ không phải nghiệp vụ nói, và đoán sai thì người dùng bấm
 * nhầm việc.
 */
export function pickPrimaryRecordAction(
  actions: RecordAction[],
  scanModeKind?: RecordActionKind | null,
): RecordAction | null {
  const workActions = actions.filter(
    (action) => action.group === "work" && !action.inPlace,
  );

  if (workActions.length === 0) return null;

  if (scanModeKind) {
    const matchedMode = workActions.find(
      (action) => action.kind === scanModeKind,
    );
    if (matchedMode) return matchedMode;
  }

  return workActions.length === 1 ? workActions[0] : null;
}
