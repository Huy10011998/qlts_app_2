import React from "react";
import { StyleSheet, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useAppColors } from "../../../utils/helpers/colors";
import { FEATURE_SECTIONS } from "../FeaturesScreen.styles";
import type { FeatureTileGroup } from "./FeatureTile";

/**
 * Chấm nhỏ ở góc dưới icon cho biết ô thuộc nhóm nào: trùng icon và màu nhãn
 * nhóm của màn Chức năng (Tiện ích lưới đỏ, Phương tiện xe xanh, Báo cáo biểu
 * đồ tím).
 *
 * Chấm có trước cho Báo cáo: báo cáo dùng lại icon của chức năng nó thuộc (Tài
 * sản, PCCC…) để nhìn là biết báo cáo gì, nên cần chấm biểu đồ để không lẫn với
 * chính chức năng đó. Từ 29/10 màn Chức năng gắn cho cả ba nhóm cho đồng bộ;
 * Truy cập nhanh ở Trang chủ vẫn chỉ gắn cho báo cáo.
 *
 * Đặt trong khung icon (`position: relative`); viền màu nền thẻ để chấm tách
 * khỏi khung icon.
 */
export default function GroupIconMarker({ group }: { group: FeatureTileGroup }) {
  const colors = useAppColors();
  const colorByGroup = {
    feature: colors.red,
    vehicle: colors.sky,
    report: colors.violet,
  };

  return (
    <View
      style={[
        styles.marker,
        { backgroundColor: colorByGroup[group], borderColor: colors.surface },
      ]}
    >
      <Ionicons
        name={FEATURE_SECTIONS[group].markerIconName}
        size={9}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
