import {
  FRIDGE_NAME_CLASS,
  toFridgeSummary,
} from "../../../../screens/NoiDia/shared/fridgeLookup";
import {
  TRUNG_CHUYEN_NAME_CLASS,
  XAC_NHAN_VI_TRI_NAME_CLASS,
} from "../../../../services/data/callApi";
import { getRecordActionKindInfo } from "../../../../constants/recordActionKinds";
import type { RecordAction, RecordActionBuilderContext } from "./types";

type BuildFridgeActionsArgs = Pick<
  RecordActionBuilderContext,
  "item" | "nameClass"
> & {
  can: (nameClass: string, action: string) => boolean;
  navigate: (screen: string, params?: Record<string, any>) => void;
};

/**
 * Hai nghiệp vụ riêng của tủ lạnh nội địa.
 *
 * Khác việc tạo bản ghi con ở ba điểm, và đó là lý do `RecordAction` phải có
 * `kind` + `run({ quick })` chứ không phải một danh sách phẳng:
 * - Quyền nằm ở class nghiệp vụ (`XacNhanViTri_TuLanh`), KHÔNG phải class của bản
 *   ghi (`NoiDia_TuLanh`).
 * - Màn đích cần `FridgeSummary`, không nhận thẳng bản ghi thô — `toFridgeSummary`
 *   vừa chuyển đổi vừa là cửa kiểm tính hợp lệ (trả null nếu không có id).
 * - Có hai đích: bấm từ màn chi tiết thì mở lịch sử để xem đã làm gì rồi, còn
 *   đang quét liên tục thì vào thẳng form.
 *
 * Trả mảng rỗng khi không phải tủ lạnh, để nơi gọi gọi vô điều kiện.
 */
export function buildFridgeActions({
  can,
  item,
  nameClass,
  navigate,
}: BuildFridgeActionsArgs): RecordAction[] {
  if (nameClass !== FRIDGE_NAME_CLASS) return [];

  const fridge = toFridgeSummary(item);
  if (!fridge) return [];

  const actions: RecordAction[] = [];

  if (can(XAC_NHAN_VI_TRI_NAME_CLASS, "Read")) {
    const info = getRecordActionKindInfo("xacNhanViTriTuLanh");

    actions.push({
      key: "fridge:xac-nhan-vi-tri",
      kind: "xacNhanViTriTuLanh",
      label: info?.label ?? "Xác nhận vị trí tủ lạnh",
      icon: info?.icon,
      group: "work",
      // `Read` đủ để xem lịch sử, nhưng vào thẳng form là tạo mới nên cần `Insert`
      // — cùng cửa mà nút thêm trên màn lịch sử đang giữ.
      canQuickRun: can(XAC_NHAN_VI_TRI_NAME_CLASS, "Insert"),
      run: ({ quick }) =>
        navigate(
          quick ? "XacNhanViTriTuLanhForm" : "XacNhanViTriTuLanhLichSu",
          { fridge },
        ),
    });
  }

  if (can(TRUNG_CHUYEN_NAME_CLASS, "Read")) {
    const info = getRecordActionKindInfo("trungChuyenTuLanh");

    actions.push({
      key: "fridge:trung-chuyen",
      kind: "trungChuyenTuLanh",
      label: info?.label ?? "Trung chuyển tủ lạnh",
      icon: info?.icon,
      group: "work",
      canQuickRun: can(TRUNG_CHUYEN_NAME_CLASS, "Insert"),
      // Bước đầu của wizard trung chuyển nhận danh sách tủ, không nhận một tủ.
      run: ({ quick }) =>
        quick
          ? navigate("TrungChuyenTuLanhChonNhaPhanPhoi", { fridges: [fridge] })
          : navigate("TrungChuyenTuLanhLichSu", { fridge }),
    });
  }

  return actions;
}
