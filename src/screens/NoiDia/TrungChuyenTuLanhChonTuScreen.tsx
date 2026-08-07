// ============================================================================
// MÀN QUÉT NHIỀU TỦ — ĐANG TẮT, chờ tương lai.
//
// Luồng trung chuyển hiện chỉ chuyển đúng con tủ mở từ màn chi tiết, nên màn
// lịch sử đi thẳng sang "Chọn nhà phân phối" và không ai vào màn này nữa.
//
// Bật lại cần 3 chỗ:
//   1. Bỏ comment toàn bộ file này.
//   2. AppNavigator.tsx — bỏ comment dòng import và khối <Stack.Screen
//      name="TrungChuyenTuLanhChonTu">.
//   3. TrungChuyenTuLanhLichSuScreen.tsx — trỏ nút (+) về
//      "TrungChuyenTuLanhChonTu" thay vì "TrungChuyenTuLanhChonNhaPhanPhoi".
//
// Type route "TrungChuyenTuLanhChonTu" trong navigator.d.tsx vẫn giữ, không
// phải khai lại. shared/FridgeScannerView.tsx cũng giữ — hiện chỉ file này
// dùng, đừng xoá kẻo bật lại thì thiếu.
// ============================================================================

// import React, { useCallback } from "react";
// import { useNavigation, useRoute } from "@react-navigation/native";
//
// import type { StackNavigation, StackRoute } from "../../types/index";
// import FridgeScannerView from "./shared/FridgeScannerView";
// import type { FridgeSummary } from "./shared/fridgeLookup";
//
// /**
//  * Bước [1] của luồng trung chuyển: tủ vào từ màn lịch sử đã nằm sẵn trong danh
//  * sách, cho quét thêm tủ khác nếu muốn chuyển cùng lượt (tất cả cùng về một
//  * khách hàng).
//  */
// export default function TrungChuyenTuLanhChonTuScreen() {
//   const navigation = useNavigation<StackNavigation<"TrungChuyenTuLanhChonTu">>();
//   const { fridges } = useRoute<StackRoute<"TrungChuyenTuLanhChonTu">>().params;
//
//   const handleSubmit = useCallback(
//     (selected: FridgeSummary[]) => {
//       navigation.navigate("TrungChuyenTuLanhChonNhaPhanPhoi", {
//         fridges: selected,
//       });
//     },
//     [navigation],
//   );
//
//   return (
//     <FridgeScannerView
//       title="Chọn tủ cần trung chuyển"
//       multiple
//       initialSelected={fridges}
//       submitLabel="TIẾP TỤC"
//       onSubmit={handleSubmit}
//     />
//   );
// }
