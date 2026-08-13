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
import { error } from "../../utils/Logger";

/**
 * Mục riêng của màn chi tiết QR cho menu ⋯. Hiện chỉ có "Đánh giá", và chỉ khi
 * người dùng có quyền đọc đúng class đánh giá của loại thiết bị đang mở — cùng
 * lối kiểm quyền như các mục chung (Sửa/Bản sao/Xóa) trong `useAssetRecordActions`.
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
    // Báo hỏng và Thanh lý chưa có nghiệp vụ thật lẫn class quyền tương ứng trên
    // server, nên tạm không hiện: mục nào trong menu này cũng phải qua một cửa
    // quyền, bày ra một mục ai cũng thấy mà bấm vào không làm gì là sai cả hai.
    const items: DetailMenuItem[] = [];

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
