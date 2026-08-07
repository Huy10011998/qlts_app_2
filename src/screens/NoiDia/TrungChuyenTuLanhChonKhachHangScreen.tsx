import React, { useCallback, useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import {
  getNoiDiaErrorMessage,
  getTrungChuyenKhachHang,
  type KhachHangItem,
} from "../../services/data/callApi";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import NoiDiaPickerList from "./shared/NoiDiaPickerList";

/**
 * Bước [3]: chọn khách hàng của NPP đã chọn.
 *
 * Server đã tự lọc theo miền / vùng miền / khu vực lấy từ chính NPP nên app chỉ
 * gửi ID_NoiDia_NhaPhanPhoi.
 */
export default function TrungChuyenTuLanhChonKhachHangScreen() {
  const navigation =
    useNavigation<StackNavigation<"TrungChuyenTuLanhChonKhachHang">>();
  const { fridges, nhaPhanPhoi } =
    useRoute<StackRoute<"TrungChuyenTuLanhChonKhachHang">>().params;

  const [items, setItems] = useState<KhachHangItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const response = await getTrungChuyenKhachHang(nhaPhanPhoi.id);
        if (!isActive) return;

        setItems(Array.isArray(response?.data) ? response.data : []);
        setErrorMessage(null);
      } catch (e) {
        if (!isActive) return;
        if (!isNetworkRequestError(e)) error(e);

        setItems([]);
        setErrorMessage(
          isNetworkRequestError(e)
            ? "Vui lòng kiểm tra kết nối mạng rồi thử lại."
            : getNoiDiaErrorMessage(e, "Không tải được danh sách khách hàng."),
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [nhaPhanPhoi.id]);

  const handleSelect = useCallback(
    (khachHang: KhachHangItem) => {
      navigation.navigate("TrungChuyenTuLanhXacNhan", {
        fridges,
        nhaPhanPhoi,
        khachHang,
      });
    },
    [fridges, navigation, nhaPhanPhoi],
  );

  return (
    <ScreenContainer>
      <NoiDiaPickerList
        items={items}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyTitle="Nhà phân phối chưa có khách hàng"
        searchPlaceholder="Tìm khách hàng"
        contextLabel={`NPP: ${
          [nhaPhanPhoi.ma, nhaPhanPhoi.ten].filter(Boolean).join(" - ") ||
          `#${nhaPhanPhoi.id}`
        }`}
        onSelect={handleSelect}
        toPickerItem={(item) => ({
          id: item.id,
          title: [item.ma, item.ten].filter(Boolean).join(" - ") || `#${item.id}`,
        })}
      />
    </ScreenContainer>
  );
}
