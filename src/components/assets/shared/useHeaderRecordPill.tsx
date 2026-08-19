import React from "react";
import { useNavigation } from "@react-navigation/native";

import type { AssetDetailsNavigationProp } from "../../../types/index";
import { popToRecordDetailsRoot } from "../../../navigation/shared/assetNavigationReset";
import { getFieldActive, getPropertyClass } from "../../../services";
import { useSafeAlert } from "../../../hooks/useSafeAlert";
import { error } from "../../../utils/Logger";
import HeaderRecordPill from "./HeaderRecordPill";

type UseHeaderRecordPillArgs = {
  /** Mã bản ghi. Rỗng thì không vẽ pill, góc phải header để trống. */
  label?: string;
  /** Id bản ghi — id thật của bản ghi, không phải id của dòng đang xem. */
  recordId?: string;
  nameClass?: string;
  groupMenuId?: number;
  viewPermission?: string;
  assetTitleHeader?: string;
};

/**
 * Pill mã bản ghi ở góc phải header, dùng cho những màn con của một bản ghi (danh
 * sách liên quan, chi tiết lịch sử): tiêu đề màn là tên mục con nên nếu không có
 * pill thì không còn gì cho biết đang xem con của bản ghi nào.
 *
 * Bấm vào là mở tab thông tin của bản ghi đó. Đường thường chỉ là pop trong stack,
 * không tốn request nào — `popToRecordDetailsRoot` tự ghi `activeTab` cho màn cha
 * vì màn đó còn mount và đang đứng ở tab khác. Chỉ khi màn cha đã bị reset khỏi
 * stack (sau luồng lưu/nhân bản) mới phải nạp field/propertyClass rồi mở màn mới,
 * vì `AssetDetails` đọc `field` từ params chứ không tự nạp.
 */
export function useHeaderRecordPill({
  label,
  recordId,
  nameClass,
  groupMenuId,
  viewPermission,
  assetTitleHeader,
}: UseHeaderRecordPillArgs) {
  const navigation = useNavigation<AssetDetailsNavigationProp>();
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const [isOpening, setIsOpening] = React.useState(false);

  const handleOpenRecord = React.useCallback(async () => {
    if (!nameClass || !recordId) {
      navigation.goBack();
      return;
    }

    const didPop = popToRecordDetailsRoot(navigation, {
      id: String(recordId),
      nameClass,
    });
    if (didPop) return;

    setIsOpening(true);
    try {
      const [fieldRes, propRes] = await Promise.all([
        getFieldActive(nameClass),
        getPropertyClass(nameClass),
      ]);

      if (!isMounted()) return;

      navigation.navigate("AssetDetails", {
        id: String(recordId),
        nameClass,
        field: JSON.stringify(fieldRes?.data ?? []),
        propertyClass: propRes?.data,
        titleHeader: assetTitleHeader,
        groupMenuId,
        viewPermission,
        assetTitleHeader,
      });
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể mở bản ghi ${label ?? ""}`.trim());
    } finally {
      if (isMounted()) setIsOpening(false);
    }
  }, [
    assetTitleHeader,
    groupMenuId,
    isMounted,
    label,
    nameClass,
    navigation,
    recordId,
    showAlertIfActive,
    viewPermission,
  ]);

  const renderHeaderRight = React.useCallback(
    () => (
      <HeaderRecordPill
        label={label ?? ""}
        onPress={handleOpenRecord}
        disabled={isOpening}
      />
    ),
    [handleOpenRecord, isOpening, label],
  );

  React.useEffect(() => {
    // Không có mã bản ghi (điều hướng cũ, hoặc không đọc được field chữ nào) thì
    // để trống góc phải như trước, đừng vẽ pill rỗng.
    navigation.setOptions({
      headerRight: label?.trim() ? renderHeaderRight : undefined,
    });

    return () => navigation.setOptions({ headerRight: undefined });
  }, [label, navigation, renderHeaderRight]);
}
