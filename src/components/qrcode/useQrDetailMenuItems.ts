import { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../types/index";
import type { DetailMenuItem } from "../assets/detailActions/detailMenuTypes";
import { getClassReference } from "../../services";
import { getDanhGiaNameClass } from "../../constants/reviewNameClasses";
import { usePermission } from "../../hooks/usePermission";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { error, log } from "../../utils/Logger";

/**
 * Mục riêng của màn chi tiết QR cho menu ⋯: báo hỏng, thanh lý, đánh giá.
 *
 * Mục tủ lạnh KHÔNG nằm ở đây — `AssetDetailHeaderActions` đã tự gọi
 * `useFridgeMenuItems`, thêm lần nữa là ra hai mục trùng.
 */
export function useQrDetailMenuItems({
  nameClass,
  id,
}: {
  nameClass?: string;
  id?: string;
}): DetailMenuItem[] {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showAlertIfActive } = useSafeAlert();
  const { can } = usePermission();

  // Mục "Đánh giá" mở danh sách đánh giá của thiết bị, nên phải có quyền xem
  // đúng class đánh giá của loại thiết bị đang mở.
  const danhGiaNameClass = getDanhGiaNameClass(nameClass);
  const canXemDanhGia = Boolean(
    danhGiaNameClass && can(danhGiaNameClass, "Read"),
  );

  const openDanhGia = useCallback(async () => {
    if (!nameClass || !id) {
      Alert.alert("Lỗi", "Thiếu thông tin nameClass hoặc id");
      return;
    }

    try {
      const response = await getClassReference(nameClass);
      const propertyData = response?.data?.[0]?.propertyReference;
      const titleHeader = response?.data?.[0]?.moTa;
      const propertyReference = response?.data?.[0]?.name;

      navigation.navigate("QrReview", {
        idRoot: id,
        nameClassRoot: nameClass,
        nameClass: propertyReference,
        propertyReference: propertyData,
        titleHeader,
      });
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  }, [id, nameClass, navigation, showAlertIfActive]);

  return useMemo(() => {
    const items: DetailMenuItem[] = [
      {
        key: "qr-bao-hong",
        label: "Báo hỏng / Yêu cầu sửa chữa",
        icon: "construct-outline",
        onPress: () => log("Báo hỏng"),
      },
      {
        key: "qr-thanh-ly",
        label: "Thanh lý",
        icon: "archive-outline",
        onPress: () => log("Thanh lý"),
      },
    ];

    if (canXemDanhGia) {
      items.push({
        key: "qr-danh-gia",
        label: "Đánh giá",
        icon: "star-outline",
        onPress: openDanhGia,
      });
    }

    return items;
  }, [canXemDanhGia, openDanhGia]);
}
