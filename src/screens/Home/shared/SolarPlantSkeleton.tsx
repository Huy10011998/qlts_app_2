import React from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

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
 * Dựng cả chiều dài màn: hero, thẻ sản lượng, thanh chọn kỳ, rồi bốn khối số
 * liệu (cân bằng năng lượng, công suất, so sánh, lợi ích môi trường).
 *
 * Riêng khung cảnh nhà máy trong hero thì CỐ Ý để trống — nó là hình vẽ tĩnh,
 * không phải dữ liệu, tô xám lên chỉ làm xấu; chỗ đó chỉ chừa đúng chiều cao.
 *
 * Lưu ý khi sửa: đây là bản sao bố cục của `SolarPlantScreen`, đổi bố cục khối
 * nào bên đó thì ngó lại khối tương ứng ở đây.
 */
export default function SolarPlantSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const { opacity } = useSkeletonAutoFill(1, 1);
  // Cùng phép tính của `SolarHeroSection`, để dải hero cao đúng bằng lúc thật.
  const heroVisualHeight = getSceneHeight(width) + SCENE_TOP_SPACE;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.rootContent}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
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

      {/* Khối "Cân bằng năng lượng" */}
      <BlockShell colors={colors} styles={styles}>
        <Animated.View style={[styles.blockTitle, { opacity }]} />
        <Animated.View style={[styles.blockSubLabel, { opacity }]} />
        <Animated.View style={[styles.blockBigValue, { opacity }]} />
        <Animated.View style={[styles.balanceBar, { opacity }]} />

        <View style={styles.donutRow}>
          <Animated.View style={[styles.donut, { opacity }]} />
          <View style={styles.legendCol}>
            {[0, 1].map((index) => (
              <View key={`legend-${index}`} style={styles.legendItem}>
                <Animated.View style={[styles.legendDot, { opacity }]} />
                <Animated.View style={[styles.legendLabel, { opacity }]} />
                <Animated.View style={[styles.legendValue, { opacity }]} />
              </View>
            ))}
          </View>
        </View>
      </BlockShell>

      {/* Khối "Công suất" — biểu đồ đường */}
      <BlockShell colors={colors} styles={styles}>
        <Animated.View style={[styles.blockTitle, { opacity }]} />
        <View style={styles.chipRow}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={`mode-${index}`}
              style={[styles.modeChip, { opacity }]}
            />
          ))}
        </View>
        <Animated.View style={[styles.chartArea, { opacity }]} />
      </BlockShell>

      {/* Khối "So sánh" — biểu đồ cột */}
      <BlockShell colors={colors} styles={styles}>
        <Animated.View style={[styles.blockTitle, { opacity }]} />
        <View style={styles.chipRow}>
          {[0, 1].map((index) => (
            <Animated.View
              key={`compare-${index}`}
              style={[styles.modeChip, { opacity }]}
            />
          ))}
        </View>
        <Animated.View style={[styles.chartArea, { opacity }]} />
      </BlockShell>

      {/* Khối "Lợi ích môi trường" */}
      <BlockShell colors={colors} styles={styles}>
        <Animated.View style={[styles.blockTitle, { opacity }]} />
        <View style={styles.envRow}>
          {[0, 1, 2].map((index) => (
            <View key={`env-${index}`} style={styles.envItem}>
              <Animated.View style={[styles.envIcon, { opacity }]} />
              <Animated.View style={[styles.envValue, { opacity }]} />
              <Animated.View style={[styles.envLabel, { opacity }]} />
            </View>
          ))}
        </View>
      </BlockShell>
    </ScrollView>
  );
}

/**
 * Vỏ thẻ trắng dùng chung cho các khối số liệu bên dưới thanh chọn kỳ — cùng
 * lề, bo góc và viền với `blockShell` của màn thật.
 */
function BlockShell({
  children,
  colors,
  styles,
}: {
  children: React.ReactNode;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View
      style={[
        styles.block,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    rootContent: {
      paddingBottom: 24,
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

    // ─── Các khối số liệu bên dưới thanh chọn kỳ ────────────────────────────
    block: {
      marginHorizontal: 12,
      marginTop: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    blockTitle: {
      width: 176,
      height: 17,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    blockSubLabel: {
      width: 74,
      height: 12,
      borderRadius: 5,
      marginTop: 14,
      backgroundColor: c.skeleton,
    },
    blockBigValue: {
      width: 132,
      height: 26,
      borderRadius: 8,
      marginTop: 8,
      backgroundColor: c.skeleton,
    },
    balanceBar: {
      width: "100%",
      height: 12,
      borderRadius: 6,
      marginTop: 14,
      backgroundColor: c.skeleton,
    },
    donutRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginTop: 18,
    },
    donut: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: c.skeleton,
    },
    legendCol: {
      flex: 1,
      gap: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    legendLabel: {
      width: 70,
      height: 12,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    legendValue: {
      flex: 1,
      height: 12,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    modeChip: {
      width: 78,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.skeleton,
    },
    chartArea: {
      width: "100%",
      height: 190,
      borderRadius: 10,
      marginTop: 14,
      backgroundColor: c.skeleton,
    },
    envRow: {
      flexDirection: "row",
      marginTop: 16,
    },
    envItem: {
      flex: 1,
      alignItems: "center",
      gap: 8,
    },
    envIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.skeleton,
    },
    envValue: {
      width: 62,
      height: 18,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    envLabel: {
      width: 78,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
  });
