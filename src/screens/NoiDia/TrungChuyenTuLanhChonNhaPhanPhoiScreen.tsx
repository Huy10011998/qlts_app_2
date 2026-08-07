import React, { useCallback, useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import {
  getNoiDiaErrorMessage,
  type NhaPhanPhoiItem,
} from "../../services/data/callApi";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import NoiDiaPickerList from "./shared/NoiDiaPickerList";
import { loadNhaPhanPhoi } from "./shared/nhaPhanPhoiCache";

/** Bước [2]: chọn NPP — danh sách khách hàng ở bước sau phụ thuộc lựa chọn này. */
export default function TrungChuyenTuLanhChonNhaPhanPhoiScreen() {
  const navigation =
    useNavigation<StackNavigation<"TrungChuyenTuLanhChonNhaPhanPhoi">>();
  const { fridges } =
    useRoute<StackRoute<"TrungChuyenTuLanhChonNhaPhanPhoi">>().params;

  const [items, setItems] = useState<NhaPhanPhoiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const data = await loadNhaPhanPhoi();
        if (!isActive) return;

        setItems(data);
        setErrorMessage(null);
      } catch (e) {
        if (!isActive) return;
        if (!isNetworkRequestError(e)) error(e);

        setItems([]);
        setErrorMessage(
          isNetworkRequestError(e)
            ? "Vui lòng kiểm tra kết nối mạng rồi thử lại."
            : getNoiDiaErrorMessage(e, "Không tải được danh sách nhà phân phối."),
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSelect = useCallback(
    (nhaPhanPhoi: NhaPhanPhoiItem) => {
      navigation.navigate("TrungChuyenTuLanhChonKhachHang", {
        fridges,
        nhaPhanPhoi,
      });
    },
    [fridges, navigation],
  );

  return (
    <ScreenContainer>
      <NoiDiaPickerList
        items={items}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyTitle="Không có nhà phân phối nào"
        searchPlaceholder="Tìm nhà phân phối"
        // Luồng hiện tại chỉ có đúng một tủ, nên nói tên tủ cụ thể hữu ích hơn
        // là đếm số lượng. Vẫn đỡ được trường hợp bật lại bước quét nhiều tủ.
        contextLabel={
          fridges.length === 1
            ? `Trung chuyển: ${fridges[0].serialNumber || fridges[0].label}`
            : `Trung chuyển ${fridges.length} tủ lạnh`
        }
        onSelect={handleSelect}
        toPickerItem={(item) => ({
          id: item.id,
          title: [item.ma, item.ten].filter(Boolean).join(" - ") || `#${item.id}`,
          // BE có NPP không kèm miền / vùng / khu vực; ghép cứng thì ra dòng
          // "— / — / —" chẳng nói lên gì, thà bỏ hẳn dòng phụ.
          subtitle:
            [
              item.id_NoiDia_Mien_MoTa,
              item.id_NoiDia_VungMien_MoTa,
              item.id_NoiDia_KhuVuc_MoTa,
            ]
              .map((value) => value?.trim())
              .filter(Boolean)
              .join(" / ") || undefined,
        })}
      />
    </ScreenContainer>
  );
}
