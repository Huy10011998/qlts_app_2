import { useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";

import type { DetailMenuItem } from "../../../components/assets/detailActions/detailMenuTypes";
import { FRIDGE_NAME_CLASS, toFridgeSummary } from "./fridgeLookup";
import { useNoiDiaTuLanhPermissions } from "./useNoiDiaTuLanhPermissions";

/**
 * Mục nghiệp vụ tủ lạnh cho menu ⋯ của màn chi tiết.
 *
 * Chỉ có với class NoiDia_TuLanh — xác nhận vị trí và trung chuyển là nghiệp vụ
 * riêng của tủ lạnh nội địa, không phải thao tác chung của mọi loại tài sản. Trả
 * mảng rỗng khi không áp dụng, để màn nào cũng gọi được vô điều kiện.
 */
export function useFridgeMenuItems({
  nameClass,
  item,
}: {
  nameClass?: string;
  item: Record<string, any> | null;
}): DetailMenuItem[] {
  const navigation = useNavigation<any>();
  const { canXemXacNhanViTri, canXemTrungChuyen } =
    useNoiDiaTuLanhPermissions();

  // Memo hoá: `toFridgeSummary` tạo object mới mỗi lần gọi, không memo thì mảng
  // mục cũng mới theo mỗi render và menu sẽ setOptions lặp vô hạn.
  const fridge = useMemo(
    () =>
      nameClass === FRIDGE_NAME_CLASS && item ? toFridgeSummary(item) : null,
    [item, nameClass],
  );

  const goTo = useCallback(
    (screen: string) => {
      if (!fridge) return;

      navigation.navigate(screen, { fridge });
    },
    [fridge, navigation],
  );

  return useMemo(() => {
    if (!fridge) return [];

    const items: DetailMenuItem[] = [];

    if (canXemXacNhanViTri) {
      items.push({
        key: "fridge-xac-nhan-vi-tri",
        label: "Xác nhận vị trí",
        icon: "location-outline",
        onPress: () => goTo("XacNhanViTriTuLanhLichSu"),
      });
    }

    if (canXemTrungChuyen) {
      items.push({
        key: "fridge-trung-chuyen",
        label: "Trung chuyển",
        icon: "swap-horizontal-outline",
        onPress: () => goTo("TrungChuyenTuLanhLichSu"),
      });
    }

    return items;
  }, [canXemTrungChuyen, canXemXacNhanViTri, fridge, goTo]);
}
