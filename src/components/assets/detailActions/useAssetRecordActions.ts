import React from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import type { AssetDetailsNavigationProp, Field } from "../../../types";
import type { AssetItem } from "../../../types/navigator.d";
import { checkReferenceUsage, deleteItems } from "../../../services/data/callApi";
import { setShouldRefreshList } from "../../../store/AssetSlice";
import { error } from "../../../utils/Logger";
import { getFieldValue } from "../../../utils/fields/GetFieldValue";
import { useParams } from "../../../hooks/useParams";
import { usePermission } from "../../../hooks/usePermission";
import { useSafeAlert } from "../../../hooks/useSafeAlert";

type UseAssetRecordActionsArgs = {
  item: AssetItem | null | undefined;
  nameClass?: string;
  fieldActive?: Field[];
};

/**
 * Định danh bản ghi (ví dụ "PC0015") — dùng cho câu xác nhận xoá và cho badge
 * trên header.
 *
 * Field của tài sản là động (do cấu hình class), không có key `code`/`name` cố
 * định, nên lấy field đầu tiên trong danh sách đang hiển thị; theo cấu hình hiện
 * tại đó là mã. Không đọc được thì trả rỗng để nơi gọi dùng phương án chung.
 */
export const getRecordLabel = (
  item: AssetItem | null | undefined,
  fieldActive?: Field[],
) => {
  const firstField = fieldActive?.[0];
  if (!item || !firstField) return "";

  const value = getFieldValue(item, firstField);

  return typeof value === "string" && value !== "---" ? value : "";
};

/**
 * Ba hành động chung của một bản ghi tài sản (Sửa / Bản sao / Xóa) cùng quyền
 * tương ứng. Tách khỏi phần nội dung để menu trên header gọi được — trước đây
 * logic này nằm trong `TabContent` nên chỉ dùng được từ trong luồng cuộn.
 */
export function useAssetRecordActions({
  item,
  nameClass,
  fieldActive,
}: UseAssetRecordActionsArgs) {
  const route = useRoute();
  const navigation = useNavigation<AssetDetailsNavigationProp>();
  const dispatch = useDispatch();
  const { showAlertIfActive } = useSafeAlert();
  const { can } = usePermission();
  const { propertyClass, groupMenuId, viewPermission, assetTitleHeader } =
    useParams();

  const hasRecord = Boolean(nameClass && item?.id);
  const allowEdit = hasRecord && can(nameClass!, "Update");
  const allowDelete = hasRecord && can(nameClass!, "Delete");
  // Nhân bản từ màn chi tiết QR không có ý nghĩa: vào đó là để tra một mã cụ thể.
  const allowClone =
    hasRecord && route.name !== "QrDetails" && can(nameClass!, "Insert");

  const confirmDelete = React.useCallback(async () => {
    if (!item?.id) return;

    try {
      await deleteItems(nameClass || "", {
        iDs: [item.id],
        saveHistory: true,
      });

      showAlertIfActive("Thành công", "Đã xoá thông tin!", [
        {
          text: "OK",
          onPress: () => {
            dispatch(setShouldRefreshList(true));
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      error(err);
      showAlertIfActive("Lỗi", "Không thể xoá thông tin!");
    }
  }, [dispatch, item, nameClass, navigation, showAlertIfActive]);

  const onDelete = React.useCallback(async () => {
    if (!item?.id) return;

    try {
      const res = await checkReferenceUsage(nameClass || "", [item.id]);
      const refList = res?.data;

      if (Array.isArray(refList) && refList.length > 0) {
        const refMessage = refList.map((e) => `• ${e.message}`).join("\n");

        showAlertIfActive(
          "Không thể xóa thông tin",
          `Thông tin đang được tham chiếu tại:\n\n${refMessage}`,
        );
        return;
      }

      const label = getRecordLabel(item, fieldActive);

      showAlertIfActive(
        "Xác nhận xoá",
        label
          ? `Xoá "${label}"? Thao tác này không hoàn lại được.`
          : "Bạn có chắc chắn muốn xoá thông tin này?",
        [
          { text: "Huỷ", style: "cancel" },
          { text: "Xóa", style: "destructive", onPress: () => confirmDelete() },
        ],
        { cancelable: true },
      );
    } catch (err) {
      error(err);
      showAlertIfActive("Lỗi", "Không thể kiểm tra dữ liệu tham chiếu!");
    }
  }, [confirmDelete, fieldActive, item, nameClass, showAlertIfActive]);

  const onEdit = React.useCallback(() => {
    if (!item) return;

    try {
      navigation.navigate("AssetEditItem", {
        item,
        nameClass,
        field: JSON.stringify(fieldActive ?? []),
      });
    } catch (err) {
      error(err);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  }, [fieldActive, item, nameClass, navigation, showAlertIfActive]);

  const onClone = React.useCallback(() => {
    if (!item) return;

    try {
      const relatedRouteParams =
        route.name === "AssetRelatedDetails"
          ? (route.params as
              | {
                  idRoot?: string;
                  propertyReference?: string;
                  nameClassRoot?: string;
                  titleHeader?: string;
                  returnTo?: "assetList" | "assetRelatedList" | "qrReview";
                }
              | undefined)
          : undefined;

      const cloneReturnTo =
        relatedRouteParams?.returnTo === "qrReview"
          ? "qrReview"
          : route.name === "AssetRelatedDetails"
          ? "assetRelatedList"
          : "assetList";

      navigation.navigate("AssetCloneItem", {
        item,
        nameClass,
        propertyClass,
        field: JSON.stringify(fieldActive ?? []),
        returnTo: cloneReturnTo,
        idRoot: relatedRouteParams?.idRoot,
        propertyReference: relatedRouteParams?.propertyReference,
        nameClassRoot: relatedRouteParams?.nameClassRoot,
        titleHeader: relatedRouteParams?.titleHeader,
        groupMenuId,
        viewPermission,
        assetTitleHeader,
      });
    } catch (err) {
      error(err);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  }, [
    assetTitleHeader,
    fieldActive,
    groupMenuId,
    item,
    nameClass,
    navigation,
    propertyClass,
    route.name,
    route.params,
    showAlertIfActive,
    viewPermission,
  ]);

  return { allowEdit, allowClone, allowDelete, onEdit, onClone, onDelete };
}
