import { useCallback } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";

import type { Item, StackNavigation, StackRoute } from "../../../types/index";
import { getAssetMenuMobileRoute } from "./assetMenuHelpers";

/** Mục lá đã mở, đủ để mở lại từ hàng Truy cập nhanh. */
export type AssetMenuTarget = Pick<
  Item,
  "id" | "label" | "contentName_Mobile" | "isReport" | "isViewWeb"
> &
  Pick<Item, "viewWebMobile" | "iconMobile">;

export const toAssetMenuTarget = (item: Item): AssetMenuTarget => ({
  id: item.id,
  label: item.label,
  contentName_Mobile: item.contentName_Mobile,
  isReport: item.isReport,
  isViewWeb: item.isViewWeb,
  viewWebMobile: item.viewWebMobile,
  iconMobile: item.iconMobile,
});

/**
 * Mở một mục menu tài sản. Tách khỏi thẻ trong danh sách để hàng Truy cập nhanh
 * mở đúng cùng một cách — trước đây logic này nằm trong `onPress` của thẻ nên
 * chỗ nào muốn mở lại phải chép lại toàn bộ nhánh điều kiện.
 */
export function useAssetMenuNavigate({
  onShowReport,
  onOpened,
}: {
  onShowReport: (item: Item) => void;
  /** Gọi sau khi mở được một mục lá, dùng để ghi lại Truy cập nhanh. */
  onOpened?: (target: AssetMenuTarget) => void;
}) {
  const navigation = useNavigation<StackNavigation<"AssetList">>();
  const route = useRoute<StackRoute<"Asset">>();

  return useCallback(
    (item: Item | AssetMenuTarget) => {
      const target = item as Item;
      const mobileRoute = getAssetMenuMobileRoute(target);

      if (mobileRoute) {
        onOpened?.(toAssetMenuTarget(target));
        navigation.navigate(mobileRoute as never);
        return;
      }

      if (target.isReport) {
        onOpened?.(toAssetMenuTarget(target));
        onShowReport(target);
        return;
      }

      if (target.contentName_Mobile) {
        onOpened?.(toAssetMenuTarget(target));
        navigation.navigate("AssetList", {
          nameClass: target.contentName_Mobile,
          titleHeader: target.label,
          groupMenuId: route.params?.groupMenuId,
          viewPermission: route.params?.viewPermission,
          assetTitleHeader: route.params?.titleHeader,
        });
      }
    },
    [navigation, onOpened, onShowReport, route.params],
  );
}
