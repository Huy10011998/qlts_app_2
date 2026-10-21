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
import {
  getSolarContentWidth,
  MAX_SOLAR_CONTENT_WIDTH,
} from "../SolarPlantScreen.helpers";
import {
  ChartSkeleton,
  getSceneHeight,
  getSceneTopSpace,
  getSolarHeroScale,
} from "../SolarPlantScreen.visuals";

/**
 * Ba ô số của thẻ "Sản lượng tích luỹ" — Tháng này · Năm nay · Từ đầu, xem
 * `EnergyProducedSummary`.
 */
const SUMMARY_ITEMS = 3;

/**
 * Chiều cao khung chờ biểu đồ của màn thật (hằng số riêng trong
 * `SolarPlantScreen`, không export): viên nhãn mốc 36 + biểu đồ 180 + hai hàng
 * chú giải 34 (kỳ Ngày, biểu đồ gộp có ba mục chú giải xếp hai hàng).
 */
const POWER_CHART_SKELETON_HEIGHT = 36 + 180 + 34 * 2;
/** Biểu đồ so sánh 200 + một hàng chú giải 34. */
const COMPARE_CHART_SKELETON_HEIGHT = 200 + 34;

/**
 * Khung chờ của màn Điện mặt trời, dùng cho cổng chặn ĐẦU TIÊN: chờ đọc quyền
 * và chờ danh sách đồng hồ. Mọi endpoint dữ liệu đều cần `ID_DongHoSolar` lấy từ
 * danh sách đó, nên trước khi có nó màn không vẽ được số nào.
 *
 * Trước đây chỗ này là vòng xoay giữa màn trắng — mà đây lại là màn chờ lâu
 * nhất app, tức là chỗ khung chờ đáng giá nhất thì lại không có.
 *
 * Dựng cả chiều dài màn: hero, thẻ sản lượng, thanh chọn kỳ, rồi bốn khối số
 * liệu (cân bằng năng lượng, công suất, so sánh, lợi ích môi trường). Bốn khối
 * này ở màn thật là dải trắng tràn hai mép (`whiteSection`, cách nhau 8), không
 * phải thẻ bo góc có viền. Hai khối biểu đồ dùng lại chính `ChartSkeleton` của
 * màn thật với đúng chiều cao nó dựng lúc chưa có số.
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
  const contentWidth = getSolarContentWidth(width);
  const visualWidth = Math.min(contentWidth, MAX_SOLAR_CONTENT_WIDTH);
  const heroScale = getSolarHeroScale(visualWidth);
  const heroVisualHeight =
    getSceneHeight(visualWidth) + getSceneTopSpace(visualWidth);
  // Hệ số thu của các con số lớn bên dưới (`sizeScale` của màn thật) và bề
  // ngang biểu đồ.
  const sizeScale = getSolarHeroScale(contentWidth);
  const chartWidth = Math.max(260, contentWidth - 32);

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
            {/* Số 36pt × hệ số hero: dòng cao ~43 × hệ số. */}
            <Animated.View
              style={[
                styles.prodValue,
                {
                  height: 30 * heroScale,
                  marginVertical: 6.5 * heroScale,
                  opacity,
                },
              ]}
            />
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

      {/* Khối "Cân bằng năng lượng": hai cụm Sản xuất và Tiêu thụ, cách nhau
          một vạch, cuối khối là dòng tự dùng. */}
      <BlockShell styles={styles}>
        <Animated.View style={[styles.blockTitle, { opacity }]} />
        <BalanceCluster
          colors={colors}
          opacity={opacity}
          sizeScale={sizeScale}
          styles={styles}
        />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <BalanceCluster
          colors={colors}
          opacity={opacity}
          sizeScale={sizeScale}
          styles={styles}
        />
        <Animated.View style={[styles.selfLine, { opacity }]} />
      </BlockShell>

      {/* Khối "Công suất": nút Gộp / Tách biểu đồ, hàng tiêu đề + nút phóng to,
          rồi khung chờ biểu đồ. */}
      <BlockShell styles={styles}>
        <SegmentRow count={2} opacity={opacity} styles={styles} tall />
        <ChartHeader opacity={opacity} styles={styles} />
        <ChartSkeleton
          height={POWER_CHART_SKELETON_HEIGHT}
          isLoading
          message=""
          width={chartWidth}
        />
      </BlockShell>

      {/* Khối "So sánh sản lượng": tiêu đề, ba tab theo tháng / quý / năm. */}
      <BlockShell styles={styles}>
        <ChartHeader opacity={opacity} styles={styles} />
        <SegmentRow count={3} opacity={opacity} styles={styles} />
        <ChartSkeleton
          height={COMPARE_CHART_SKELETON_HEIGHT}
          isLoading
          message=""
          width={chartWidth}
        />
      </BlockShell>

      {/* Khối "Lợi ích môi trường": hai ô (CO₂, quãng đường quy đổi). */}
      <BlockShell styles={styles}>
        <View style={styles.envHeader}>
          <Animated.View style={[styles.envTitle, { opacity }]} />
          <Animated.View style={[styles.envInfo, { opacity }]} />
        </View>
        <View style={styles.envRow}>
          {[0, 1].map((index) => (
            <View key={`env-${index}`} style={styles.envItem}>
              {/* Hình minh hoạ SVG 80 × 72 (× hệ số) — chỉ chừa chỗ, chấm xám
                  ở giữa cho biết có hình. */}
              <View
                style={[
                  styles.envArt,
                  { width: 80 * sizeScale, height: 72 * sizeScale },
                ]}
              >
                <Animated.View
                  style={[
                    styles.envIcon,
                    {
                      width: 44 * sizeScale,
                      height: 44 * sizeScale,
                      borderRadius: 22 * sizeScale,
                      opacity,
                    },
                  ]}
                />
              </View>
              {/* Số 28pt × hệ số: dòng ~33 × hệ số. */}
              <Animated.View
                style={[
                  styles.envValue,
                  {
                    height: 24 * sizeScale,
                    marginVertical: 4.5 * sizeScale,
                    opacity,
                  },
                ]}
              />
              {/* Nhãn 12pt hai dòng (~28.6). */}
              <View style={styles.envLabelLines}>
                <Animated.View style={[styles.envLabel, { opacity }]} />
                <Animated.View
                  style={[styles.envLabel, styles.envLabelShort, { opacity }]}
                />
              </View>
            </View>
          ))}
        </View>
      </BlockShell>
    </ScrollView>
  );
}

/**
 * Vỏ dùng chung cho các khối số liệu bên dưới thanh chọn kỳ — đúng
 * `whiteSection` của màn thật: dải trắng tràn hai mép, cách khối trên 8, không
 * bo góc, không viền.
 */
function BlockShell({
  children,
  styles,
}: {
  children: React.ReactNode;
  styles: SkeletonStyles;
}) {
  return <View style={styles.block}>{children}</View>;
}

type SkeletonStyles = ReturnType<typeof makeStyles>;
type SkeletonOpacity = ReturnType<typeof useSkeletonAutoFill>["opacity"];

/**
 * Một cụm của khối Cân bằng năng lượng: nhãn 14pt, số lớn 32pt × hệ số, thanh
 * tỉ trọng 10, rồi hàng vòng tròn 84 × hệ số + hai dòng chú giải.
 */
function BalanceCluster({
  colors,
  opacity,
  sizeScale,
  styles,
}: {
  colors: AppColors;
  opacity: SkeletonOpacity;
  sizeScale: number;
  styles: SkeletonStyles;
}) {
  const donutSize = Math.round(84 * sizeScale);
  // `DonutChart` vẽ vòng bán kính (size − 14) / 2, nét 10: mép ngoài vòng hụt
  // 2 so với khung mỗi bên.
  const ringSize = donutSize - 4;

  return (
    <>
      <Animated.View style={[styles.blockSubLabel, { opacity }]} />
      <Animated.View
        style={[
          styles.blockBigValue,
          {
            height: 26 * sizeScale,
            marginVertical: 6 * sizeScale,
            opacity,
          },
        ]}
      />
      <Animated.View
        style={[styles.balanceBar, { backgroundColor: colors.border, opacity }]}
      />

      <View style={styles.donutRow}>
        <View style={{ width: donutSize, height: donutSize }}>
          <Animated.View
            style={[
              styles.donutRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                opacity,
              },
            ]}
          />
        </View>
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
    </>
  );
}

/**
 * Hàng nút viền xanh (Gộp / Tách biểu đồ, Theo tháng / quý / năm), ô đầu tô
 * như đang chọn. `tall` là hàng Gộp / Tách: chữ 14pt, đệm 10, cách dưới 16;
 * còn lại chữ 13pt, đệm 8, cách dưới 8.
 */
function SegmentRow({
  count,
  opacity,
  styles,
  tall = false,
}: {
  count: number;
  opacity: SkeletonOpacity;
  styles: SkeletonStyles;
  tall?: boolean;
}) {
  return (
    <View style={[styles.segmentRow, tall && styles.segmentRowTall]}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`segment-${index}`}
          style={[styles.segment, index === 0 && styles.segmentActive]}
        >
          <Animated.View style={[styles.segmentLabel, { opacity }]} />
        </View>
      ))}
    </View>
  );
}

/** Hàng tiêu đề biểu đồ: chữ 15pt bên trái, nút phóng to 52 × 52 bên phải. */
function ChartHeader({
  opacity,
  styles,
}: {
  opacity: SkeletonOpacity;
  styles: SkeletonStyles;
}) {
  return (
    <View style={styles.chartHeader}>
      <Animated.View style={[styles.chartTitle, { opacity }]} />
      <View style={styles.expandSlot}>
        <Animated.View style={[styles.expandIcon, { opacity }]} />
      </View>
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
    // Cùng `heroTopRow` / `productionBlock` của màn thật.
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
    },
    productionBlock: {
      flex: 1,
      minWidth: 150,
    },
    // "Sản lượng hôm nay" 14pt (dòng ~17); dòng số bên dưới cao theo hệ số hero
    // nên đặt inline.
    prodLabel: {
      width: 148,
      height: 14,
      marginTop: 2,
      marginBottom: 1,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    prodValue: {
      width: 116,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    // `weatherRow` marginTop 4 + nhiệt độ 20pt (dòng ~24).
    temp: {
      width: 64,
      height: 20,
      marginTop: 6,
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
    // "Sản lượng tích luỹ" 16pt (dòng ~19).
    summaryTitle: {
      width: 142,
      height: 16,
      marginVertical: 1.5,
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
    // `epItem`: nhãn 12pt (~14) cách 2, số 18pt (~22).
    summaryItem: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    summaryLabel: {
      width: 52,
      height: 11,
      marginTop: 1.5,
      marginBottom: 3.5,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    summaryValue: {
      width: 68,
      height: 18,
      marginVertical: 2,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    // `epDivider`.
    divider: {
      width: 1,
      height: 32,
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
    // `whiteSection` của màn thật.
    block: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: c.surface,
    },
    // `sectionTitle` 16pt (dòng ~19).
    blockTitle: {
      width: 176,
      height: 15,
      marginVertical: 2,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    // `balanceSubLabel`: marginTop 12 + chữ 14pt (~17) + marginBottom 4.
    blockSubLabel: {
      width: 74,
      height: 12,
      marginTop: 14,
      marginBottom: 7,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // Số 32pt × hệ số: cao và lề dọc đặt inline.
    blockBigValue: {
      width: 132,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    // `barTrack`: cao 10, cách trên dưới 10; nền `border` như rãnh thật.
    balanceBar: {
      width: "100%",
      height: 10,
      borderRadius: 5,
      marginVertical: 10,
    },
    donutRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginVertical: 8,
    },
    donutRing: {
      margin: 2,
      borderWidth: 10,
      borderColor: c.skeleton,
    },
    legendCol: {
      flex: 1,
      gap: 10,
    },
    // Chữ chú giải 12pt (dòng ~14).
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 14,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    legendLabel: {
      width: 70,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    legendValue: {
      flex: 1,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // Vạch giữa hai cụm: cao 1, cách trên dưới 14.
    separator: {
      height: 1,
      marginVertical: 14,
    },
    // `selfConsumptionRow` marginTop 12 + chữ 13pt (~15.5).
    selfLine: {
      width: "58%",
      height: 11,
      marginTop: 14,
      marginBottom: 2,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // `subTabRow`: viền xanh 1, đệm dọc 8 + chữ 13pt → cao ~34, cách dưới 8.
    segmentRow: {
      flexDirection: "row",
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#4285f4",
      overflow: "hidden",
      marginBottom: 8,
    },
    // `toggleRow`: đệm dọc 10 + chữ 14pt → cao ~39, cách dưới 16.
    segmentRowTall: {
      height: 39,
      marginBottom: 16,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    segmentActive: {
      backgroundColor: c.accentLight,
    },
    segmentLabel: {
      width: 72,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // `chartHeaderRow`: cao bằng nút phóng to 52, cách dưới 8.
    chartHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      height: 52,
      marginBottom: 8,
    },
    chartTitle: {
      width: 150,
      height: 14,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    expandSlot: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    expandIcon: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    // Khối môi trường không có nút phóng to: hàng tiêu đề cao bằng icon ⓘ 18pt
    // (~22), cách dưới 8.
    envHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 22,
      marginBottom: 8,
    },
    envTitle: {
      width: 190,
      height: 14,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    envInfo: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.skeleton,
    },
    envRow: {
      flexDirection: "row",
      marginTop: 12,
    },
    envItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    envArt: {
      alignItems: "center",
      justifyContent: "center",
    },
    envIcon: {
      backgroundColor: c.skeleton,
    },
    envValue: {
      width: 62,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    envLabelLines: {
      height: 29,
      alignItems: "center",
      justifyContent: "space-around",
    },
    envLabel: {
      width: 78,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    envLabelShort: {
      width: 56,
    },
  });
