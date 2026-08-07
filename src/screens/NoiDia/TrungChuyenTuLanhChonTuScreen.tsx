import React, { useCallback } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";

import type { StackNavigation, StackRoute } from "../../types/index";
import FridgeScannerView from "./shared/FridgeScannerView";
import type { FridgeSummary } from "./shared/fridgeLookup";

/**
 * Bước [1] của luồng trung chuyển: tủ vào từ màn lịch sử đã nằm sẵn trong danh
 * sách, cho quét thêm tủ khác nếu muốn chuyển cùng lượt (tất cả cùng về một
 * khách hàng).
 */
export default function TrungChuyenTuLanhChonTuScreen() {
  const navigation = useNavigation<StackNavigation<"TrungChuyenTuLanhChonTu">>();
  const { fridges } = useRoute<StackRoute<"TrungChuyenTuLanhChonTu">>().params;

  const handleSubmit = useCallback(
    (selected: FridgeSummary[]) => {
      navigation.navigate("TrungChuyenTuLanhChonNhaPhanPhoi", {
        fridges: selected,
      });
    },
    [navigation],
  );

  return (
    <FridgeScannerView
      title="Chọn tủ cần trung chuyển"
      multiple
      initialSelected={fridges}
      submitLabel="TIẾP TỤC"
      onSubmit={handleSubmit}
    />
  );
}
