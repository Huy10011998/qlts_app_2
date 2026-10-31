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
import { getSolarContentWidth } from "../SolarPlantScreen.helpers";
import {
  FLOW_HERO_CARD_BORDER,
  FLOW_HERO_CARD_MARGIN,
  FLOW_HERO_CARD_RADIUS,
  getFlowHeroCardInnerWidth,
  getFlowHeroHeight,
} from "../SolarPlantScreen.flowHero";
import { ChartSkeleton, getSolarHeroScale } from "../SolarPlantScreen.visuals";

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
  // Cùng phép tính của `SolarFlowHero`, để card hero cao đúng bằng lúc thật.
  const contentWidth = getSolarContentWidth(width);
  const heroHeight = getFlowHeroHeight(getFlowHeroCardInnerWidth(contentWidth));
  const heroScale = heroHeight / getFlowHeroHeight(390);
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
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.solarHero,
            borderColor: colors.border,
            height: heroHeight + FLOW_HERO_CARD_BORDER * 2,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.productionBlock}>
            <Animated.View style={[styles.prodLabel, { opacity }]} />
            {/* Số ~21pt × hệ số hero: dòng cao ~25 × hệ số. */}
            <Animated.View
              style={[
                styles.prodValue,
                {
                  height: 20 * heroScale,
                  marginVertical: 5 * heroScale,
                  opacity,
                },
              ]}
            />
          </View>
          <Animated.View style={[styles.temp, { opacity }]} />
        </View>
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

      {/* Khối "Cân bằng năng lượng": vòng Tự chủ năng lượng, rồi hai cụm Sản
          xuất và Tiêu thụ cách nhau một vạch. */}
      <BlockShell styles={styles}>
        <Animated.View style={[styles.blockTitle, { opacity }]} />
        <AutonomyRow opacity={opacity} sizeScale={sizeScale} styles={styles} />
        <BalanceCluster colors={colors} opacity={opacity} styles={styles} />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <BalanceCluster colors={colors} opacity={opacity} styles={styles} />
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
/** Vòng Tự chủ năng lượng (96 × hệ số) + tiêu đề và hai dòng giải thích. */
function AutonomyRow({
  opacity,
  sizeScale,
  styles,
}: {
  opacity: SkeletonOpacity;
  sizeScale: number;
  styles: SkeletonStyles;
}) {
  const donutSize = Math.round(96 * sizeScale);
  // `DonutChart` vẽ vòng bán kính (size − 14) / 2, nét 10: mép ngoài vòng hụt
  // 2 so với khung mỗi bên.
  const ringSize = donutSize - 4;

  return (
    <View style={styles.autonomyRow}>
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
      <View style={styles.autonomyTextCol}>
        <Animated.View style={[styles.autonomyTitle, { opacity }]} />
        <Animated.View style={[styles.autonomyLine, { opacity }]} />
        <Animated.View
          style={[styles.autonomyLine, styles.autonomyLineShort, { opacity }]}
        />
      </View>
    </View>
  );
}

/** Một cụm Sản xuất / Tiêu thụ: tên + tổng, thanh tỉ trọng, hai dòng chia nhỏ. */
function BalanceCluster({
  colors,
  opacity,
  styles,
}: {
  colors: AppColors;
  opacity: SkeletonOpacity;
  styles: SkeletonStyles;
}) {
  return (
    <View style={styles.balanceGroup}>
      <View style={styles.balanceGroupHeader}>
        <Animated.View style={[styles.blockSubLabel, { opacity }]} />
        <Animated.View style={[styles.balanceGroupTotal, { opacity }]} />
      </View>
      <Animated.View
        style={[styles.balanceBar, { backgroundColor: colors.border, opacity }]}
      />
      <View style={styles.balanceRows}>
        {[0, 1].map((index) => (
          <View key={`row-${index}`} style={styles.balanceRow}>
            <Animated.View style={[styles.balanceIconChip, { opacity }]} />
            <Animated.View style={[styles.balanceRowLabel, { opacity }]} />
            <Animated.View style={[styles.balanceRowValue, { opacity }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Hàng nút chọn (Gộp / Tách biểu đồ, Theo tháng / quý / năm): rãnh xám nhạt,
 * ô đầu là viên đỏ như đang chọn. `tall` là hàng Gộp / Tách: cao 39,
 * cách dưới 16; còn lại cao 34, cách dưới 8.
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
          <Animated.View
            style={[
              styles.segmentLabel,
              index === 0 && styles.segmentLabelOnActive,
              { opacity },
            ]}
          />
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
      margin: FLOW_HERO_CARD_MARGIN,
      borderRadius: FLOW_HERO_CARD_RADIUS,
      borderWidth: FLOW_HERO_CARD_BORDER,
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
    // Tab đang chọn của màn thật là chip đỏ đặc, không phải khối xám.
    tabChipActive: {
      backgroundColor: c.red,
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
    // `autonomyRow`: cách trên 12, dưới 4, vòng và chữ cách 16.
    autonomyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginTop: 12,
      marginBottom: 4,
    },
    donutRing: {
      margin: 2,
      borderWidth: 10,
      borderColor: c.skeleton,
    },
    autonomyTextCol: {
      flex: 1,
      gap: 8,
    },
    // Tiêu đề 15pt, hai dòng giải thích 13pt.
    autonomyTitle: {
      width: 130,
      height: 14,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    autonomyLine: {
      width: "100%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    autonomyLineShort: {
      width: "60%",
    },
    // `balanceGroup` cách trên 16; hàng tên + tổng theo dòng chữ 20pt (~24).
    balanceGroup: {
      marginTop: 16,
    },
    balanceGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 24,
    },
    blockSubLabel: {
      width: 64,
      height: 12,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    balanceGroupTotal: {
      width: 96,
      height: 18,
      borderRadius: 7,
      backgroundColor: c.skeleton,
    },
    // `barTrack`: cao 10, cách trên dưới 10; nền `border` như rãnh thật.
    balanceBar: {
      width: "100%",
      height: 10,
      borderRadius: 5,
      marginVertical: 10,
    },
    // Mỗi dòng cao theo chấm icon 26, hai dòng cách 8.
    balanceRows: {
      gap: 8,
    },
    balanceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    balanceIconChip: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.skeleton,
    },
    balanceRowLabel: {
      flex: 1,
      maxWidth: 96,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    balanceRowValue: {
      width: 90,
      height: 11,
      marginLeft: "auto",
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // Vạch giữa hai cụm: cao 1, cách trên dưới 14.
    separator: {
      height: 1,
      marginVertical: 14,
    },
    // `subTabRow`: rãnh xám đệm 3, viên đệm dọc 6 + chữ 13pt → cao ~34, cách dưới 8.
    segmentRow: {
      flexDirection: "row",
      height: 34,
      padding: 3,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      marginBottom: 8,
    },
    // `toggleRow`: viên đệm dọc 8 + chữ 14pt → cao ~39, cách dưới 16.
    segmentRowTall: {
      height: 39,
      marginBottom: 16,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
    },
    segmentActive: {
      backgroundColor: c.red,
    },
    segmentLabel: {
      width: 72,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.skeleton,
    },
    // Vạch chữ trên viên đỏ: trắng mờ như chữ trắng của ô đang chọn.
    segmentLabelOnActive: {
      backgroundColor: "rgba(255,255,255,0.55)",
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
