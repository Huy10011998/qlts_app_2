import React from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../../../components/ui/useSkeletonAutoFill";
import { getSceneHeight, SCENE_TOP_SPACE } from "../SolarPlantScreen.visuals";

/** Bốn ô số của thẻ "Sản lượng tích luỹ" — xem `EnergyProducedSummary`. */
const SUMMARY_ITEMS = 4;

/**
 * Khung chờ của màn Điện mặt trời, dùng cho cổng chặn ĐẦU TIÊN: chờ đọc quyền
 * và chờ danh sách đồng hồ. Mọi endpoint dữ liệu đều cần `ID_DongHoSolar` lấy từ
 * danh sách đó, nên trước khi có nó màn không vẽ được số nào.
 *
 * Trước đây chỗ này là vòng xoay giữa màn trắng — mà đây lại là màn chờ lâu
 * nhất app, tức là chỗ khung chờ đáng giá nhất thì lại không có.
 *
 * CỐ Ý chỉ dựng ba dải cấu trúc (vùng hero, thẻ sản lượng, thanh chọn kỳ) chứ
 * không vẽ lại khung cảnh nhà máy, ba bong bóng hay các khối biểu đồ:
 *
 * - Khung cảnh là hình vẽ tĩnh, không phải dữ liệu — tô xám lên nó chỉ làm xấu.
 * - Các khối số liệu bên dưới đã có cách chờ riêng của màn: hiện nhãn thật với
 *   giá trị "—" và một vạch chạy trên viền khối (`RefreshBar`), cố ý KHÔNG che
 *   bằng khung xám. Dựng lại chúng ở đây là đi ngược cách đó, và thành hai bản
 *   sao của cùng một bố cục phải sửa song song.
 *
 * Việc của khung chờ này chỉ là: giữ đúng chiều cao và màu nền của phần trên
 * màn, để lúc dữ liệu về nội dung thật không nhảy từ giữa màn ra.
 */
export default function SolarPlantSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const { opacity } = useSkeletonAutoFill(1, 1);
  // Cùng phép tính của `SolarHeroSection`, để dải hero cao đúng bằng lúc thật.
  const heroVisualHeight = getSceneHeight(width) + SCENE_TOP_SPACE;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg }]}
      accessibilityLabel="Đang tải dữ liệu điện mặt trời"
    >
      <View style={[styles.hero, { backgroundColor: colors.solarHero }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.productionBlock}>
            <Animated.View style={[styles.prodLabel, { opacity }]} />
            <Animated.View style={[styles.prodValue, { opacity }]} />
          </View>
          <Animated.View style={[styles.temp, { opacity }]} />
        </View>

        <View style={{ height: heroVisualHeight }} />
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.summaryRow}>
          <Animated.View style={[styles.summaryTitle, { opacity }]} />
          <Animated.View style={[styles.summaryMeta, { opacity }]} />
        </View>

        <View style={styles.summaryStats}>
          {Array.from({ length: SUMMARY_ITEMS }).map((_, index) => (
            <React.Fragment key={`stat-${index}`}>
              {index > 0 ? (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              ) : null}
              <View style={styles.summaryItem}>
                <Animated.View style={[styles.summaryLabel, { opacity }]} />
                <Animated.View style={[styles.summaryValue, { opacity }]} />
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt }]}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Animated.View
            key={`tab-${index}`}
            style={[
              styles.tabChip,
              index === 0 && styles.tabChipActive,
              { opacity },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.dateNav,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Animated.View style={[styles.dateNavSide, { opacity }]} />
        <Animated.View style={[styles.dateNavCenter, { opacity }]} />
        <Animated.View style={[styles.dateNavSide, { opacity }]} />
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      // Dải cuối dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
    },
    hero: {
      overflow: "hidden",
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
    },
    productionBlock: {
      flex: 1,
      minWidth: 190,
      gap: 8,
    },
    prodLabel: {
      width: 148,
      height: 14,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    prodValue: {
      width: 116,
      height: 30,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    temp: {
      width: 64,
      height: 20,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryCard: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    summaryTitle: {
      width: 142,
      height: 16,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    summaryMeta: {
      width: 88,
      height: 12,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    summaryStats: {
      flexDirection: "row",
      alignItems: "center",
    },
    summaryItem: {
      flex: 1,
      minWidth: 96,
      alignItems: "center",
      gap: 6,
    },
    summaryLabel: {
      width: 52,
      height: 12,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    summaryValue: {
      width: 68,
      height: 20,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    divider: {
      width: 1,
      height: 36,
    },
    tabBar: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 8,
      gap: 2,
    },
    tabChip: {
      flexShrink: 1,
      height: 26,
      width: 62,
      borderRadius: 18,
      backgroundColor: c.skeleton,
    },
    // Tab đang chọn của màn thật là chip xanh đặc, không phải khối xám.
    tabChipActive: {
      backgroundColor: "#4285f4",
    },
    dateNav: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 60,
      paddingHorizontal: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dateNavSide: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    dateNavCenter: {
      width: 168,
      height: 15,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
  });
