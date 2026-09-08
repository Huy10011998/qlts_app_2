import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import {
  FEATURE_CARD_PADDING,
  FEATURE_SCREEN_PADDING,
  FEATURE_TILE_WIDTH,
} from "../FeaturesScreen.styles";

/**
 * Ba nhóm của màn thật kèm số ô dựng sẵn.
 *
 * Tên nhóm là chuỗi cố định trong `FeaturesScreen` nên hiện được chữ THẬT; còn
 * số ô thì tuỳ quyền, chỉ biết sau `GET_MENU_ACTIVE` — đây là phần xấp xỉ duy
 * nhất, lấy theo bố cục thường gặp (Tiện ích hai hàng, hai nhóm sau một hàng).
 */
const SECTIONS = [
  { title: "Tiện ích", tiles: 6 },
  { title: "Phương tiện", tiles: 3 },
  { title: "Báo cáo", tiles: 3 },
];

/**
 * Khung chờ danh mục chức năng.
 *
 * Trước đây chỗ này mượn `MenuCardSkeleton` — khung của màn DANH SÁCH, mỗi dòng
 * một thẻ ngang. Màn này lại là lưới 3 cột icon tròn trong thẻ trắng, nên khung
 * chờ vẽ ra một bố cục không hề tồn tại: chờ xong là cả trang thay hình.
 *
 * Ô tìm kiếm KHÔNG nằm ở đây — nó không phụ thuộc dữ liệu nên màn dựng đồ thật
 * ngay bên trên, khỏi tô xám một thứ đã sẵn sàng.
 */
export default function FeaturesScreenSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <View style={styles.wrap} accessibilityLabel="Đang tải danh mục chức năng">
      {SECTIONS.map((section) => (
        <View
          key={section.title}
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
          ]}
        >
          <View
            style={[
              styles.sectionHeader,
              { borderBottomColor: colors.separator },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          </View>

          <View style={styles.sectionGrid}>
            {Array.from({ length: section.tiles }).map((_, index) => (
              <View key={`tile-${index}`} style={styles.tile}>
                <View
                  style={[
                    styles.tileIcon,
                    { backgroundColor: colors.skeleton },
                  ]}
                />
                <View
                  style={[
                    styles.tileLabel,
                    index % 2 === 1 && styles.tileLabelShort,
                    { backgroundColor: colors.skeleton },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ cuối dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      paddingHorizontal: FEATURE_SCREEN_PADDING,
      paddingTop: 12,
      gap: 14,
    },
    sectionCard: {
      borderRadius: 20,
      paddingHorizontal: FEATURE_CARD_PADDING,
      paddingTop: 14,
      paddingBottom: 6,
      borderWidth: StyleSheet.hairlineWidth,
    },
    sectionHeader: {
      marginHorizontal: -FEATURE_CARD_PADDING,
      paddingHorizontal: FEATURE_CARD_PADDING,
      paddingBottom: 12,
      marginBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: 0.2,
    },
    sectionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    tile: {
      width: FEATURE_TILE_WIDTH,
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    tileIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginBottom: 8,
    },
    // Nhãn thật cao 32 cho tên hai dòng; khung chờ chỉ tô một vạch nằm giữa ô
    // đó, để hàng dưới vẫn bắt đầu đúng chỗ.
    tileLabel: {
      width: "78%",
      height: 11,
      marginTop: 5,
      marginBottom: 16,
      borderRadius: 5,
    },
    tileLabelShort: {
      width: "56%",
    },
  });
