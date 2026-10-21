import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { getTextScaleFactor } from "../../../utils/helpers/textScaling";
import { makeFeatureStyles } from "../FeaturesScreen.styles";
import type { FeatureTileGroup } from "./FeatureTile";
import { getHomeCardChrome } from "./homeBlockTone";

/**
 * Ba nhóm của màn thật kèm số ô dựng sẵn.
 *
 * Tên nhóm là chuỗi cố định trong `FeaturesScreen` nên hiện được chữ THẬT; còn
 * số ô thì tuỳ quyền, chỉ biết sau `GET_MENU_ACTIVE` — đây là phần xấp xỉ duy
 * nhất, lấy theo bố cục thường gặp (Tiện ích hai hàng, hai nhóm sau một hàng).
 */
const SECTIONS: { title: string; group: FeatureTileGroup; tiles: number }[] = [
  { title: "Tiện ích", group: "feature", tiles: 6 },
  { title: "Phương tiện", group: "vehicle", tiles: 3 },
  { title: "Báo cáo", group: "report", tiles: 3 },
];

/**
 * Khung chờ danh mục chức năng.
 *
 * Trước đây chỗ này mượn `MenuCardSkeleton` — khung của màn DANH SÁCH, mỗi dòng
 * một thẻ ngang. Màn này lại là lưới 3 cột icon tròn trong thẻ trắng, nên khung
 * chờ vẽ ra một bố cục không hề tồn tại: chờ xong là cả trang thay hình.
 *
 * Thẻ nhóm, tiêu đề và ô lưới dùng thẳng `makeFeatureStyles` của màn thật, viền
 * thẻ cũng đi qua `getHomeCardChrome` với cùng màu nhóm (đỏ · xanh · tím, như
 * `FeaturesScreen`) — vẽ lại bản sao thì sửa thẻ thật là khung chờ lệch theo.
 *
 * Ô tìm kiếm KHÔNG nằm ở đây — nó không phụ thuộc dữ liệu nên màn dựng đồ thật
 * ngay bên trên, khỏi tô xám một thứ đã sẵn sàng.
 */
export default function FeaturesScreenSkeleton() {
  const featureStyles = useStyles(makeFeatureStyles);
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  // Cùng bảng màu `sectionColorByGroup` của `FeaturesScreen`.
  const sectionColorByGroup: Record<FeatureTileGroup, string> = {
    feature: colors.red,
    vehicle: colors.sky,
    report: colors.violet,
  };

  return (
    <View
      style={[featureStyles.scrollContent, styles.wrap]}
      accessibilityLabel="Đang tải danh mục chức năng"
    >
      {SECTIONS.map((section) => {
        const sectionColor = sectionColorByGroup[section.group];

        return (
          <View
            key={section.title}
            style={[
              featureStyles.sectionCard,
              getHomeCardChrome({
                borderColor: sectionColor,
                shadowColor: colors.shadow,
                accent: sectionColor,
              }),
            ]}
          >
            <View
              style={[
                featureStyles.sectionHeader,
                { borderBottomColor: sectionColor },
              ]}
            >
              <Text style={featureStyles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={featureStyles.sectionGrid}>
              {Array.from({ length: section.tiles }).map((_, index) => (
                <View key={`tile-${index}`} style={featureStyles.tile}>
                  <View
                    style={[
                      featureStyles.tileIconWrap,
                      { backgroundColor: colors.skeleton },
                    ]}
                  />
                  <View style={styles.tileLabelSlot}>
                    <View
                      style={[
                        styles.tileLabel,
                        index % 2 === 1 && styles.tileLabelShort,
                        { backgroundColor: colors.skeleton },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ cuối dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
    },
    // Cao đúng bằng `tileLabel` thật (32 × cỡ chữ app, đủ tên hai dòng); khung
    // chờ chỉ tô một vạch trong ô đó, để hàng dưới vẫn bắt đầu đúng chỗ.
    tileLabelSlot: {
      width: "100%",
      height: 32 * getTextScaleFactor(),
      alignItems: "center",
    },
    tileLabel: {
      width: "78%",
      height: 11,
      marginTop: 5,
      borderRadius: 5,
    },
    tileLabelShort: {
      width: "56%",
    },
  });
