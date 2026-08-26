import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import {
  AppColors,
  C,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import HomeAssetPageCard from "./HomeAssetPageCard";
import type { HomeMachineGrowthPoint } from "./homeData";
import {
  HOME_BILLION,
  formatHomeBillion,
  formatHomeDecimal,
  formatHomeNumber,
} from "./homeFormat";
import { HOME_BRAND_RED } from "./homeTheme";
import {
  getTextScaleFactor,
  scaledSvgFontSize,
} from "../../../utils/helpers/textScaling";

type HomeMachineGrowthCardProps = {
  /** 12 mốc, giữ nguyên thứ tự cũ -> mới của server. */
  growth: HomeMachineGrowthPoint[];
  /** Luỹ kế của mốc cuối — dùng cho dòng "Hiện có". */
  totalQuantity: number;
  /** VND. */
  totalValue: number;
  /** Bề ngang thật của vùng vẽ, do khu cuộn ngang tính và truyền xuống. */
  chartWidth: number;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
};

/** Hai chuỗi của cùng một biểu đồ, đổi bằng nút chuyển chứ không xếp dọc. */
type GrowthMode = "quantity" | "value";

const CHART_HEIGHT = 116;
const PAD_LEFT = 36;
const PAD_RIGHT = 4;
const PAD_TOP = 6;
const PAD_BOTTOM = 14;
/** Cỡ nhãn trục ở hệ số cỡ chữ 1. */
const LABEL_FONT_SIZE = 8.5;
/** Bề rộng cột so với ô tháng — chừa khe để 12 cột không dính vào nhau. */
const BAR_WIDTH_RATIO = 0.56;
/** Tháng không phát sinh máy nào vẫn phải thấy là CÓ mốc và bằng 0. */
const ZERO_BAR_HEIGHT = 2;

/**
 * Tiền phát sinh của MỘT tháng, theo tỷ, kèm sẵn dấu.
 *
 * Có tháng chỉ vài chục triệu; làm tròn 1 số lẻ ra "+0 tỷ" thì đọc như không mua
 * gì, trong khi cột vẫn có chiều cao — nên dưới ngưỡng làm tròn thì ghi "< 0,1".
 */
const formatGrowthBillionDelta = (value: number) =>
  value > 0 && value < 0.05 * HOME_BILLION
    ? "< 0,1"
    : `+${formatHomeBillion(value)}`;

/**
 * Biểu đồ CỘT: số máy (hoặc giá trị) PHÁT SINH trong từng tháng.
 *
 * Trước đây trang này vẽ hai đường luỹ kế; cả 12 tháng chỉ nhích vài phần nghìn
 * (2.426 -> 2.436) nên đường luôn là một vạch ngang và người xem không đọc được
 * gì. Cùng dữ liệu đó, phần phát sinh theo tháng lại chênh nhau hàng chục lần
 * (tháng 0, tháng +34) — dạng cột cho thấy ngay tháng nào có mua sắm.
 *
 * Con số luỹ kế không mất: nó nằm ở dòng "Hiện có" phía trên và ở dòng chi tiết
 * của mốc đang chọn.
 */
function GrowthBarChart({
  values,
  points,
  width,
  color,
  activeIndex,
  onSelectIndex,
  formatTick,
}: {
  values: number[];
  points: HomeMachineGrowthPoint[];
  width: number;
  color: string;
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  formatTick: (value: number) => string;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  // Nhãn trục là `Text` của SVG nên không tự lớn theo cài đặt cỡ chữ — phải tự
  // nhân, và nới lề trái/đáy đúng bằng ngần ấy để nhãn không đè vào vùng vẽ.
  // Khung biểu đồ giữ nguyên `CHART_HEIGHT`: chữ to thì vùng vẽ hụt vài px, đổi
  // lại không màn nào phải tính lại chiều cao.
  const textScale = getTextScaleFactor();
  const labelFontSize = scaledSvgFontSize(LABEL_FONT_SIZE);
  const padLeft = Math.round(PAD_LEFT * textScale);
  const padBottom = Math.round(PAD_BOTTOM * textScale);
  const plotWidth = Math.max(0, width - padLeft - PAD_RIGHT);
  const plotHeight = CHART_HEIGHT - PAD_TOP - padBottom;
  const count = values.length;
  const baseY = PAD_TOP + plotHeight;
  const maxValue = values.reduce((max, value) => Math.max(max, value), 0);
  // Cả 12 tháng đều 0 (kỳ không mua gì) là chuyện có thật — vẫn phải vẽ được trục.
  const axisMax = maxValue > 0 ? maxValue : 1;
  const slotWidth = count > 0 ? plotWidth / count : plotWidth;
  const barWidth = Math.max(3, slotWidth * BAR_WIDTH_RATIO);

  const slotCenter = (index: number) => padLeft + (index + 0.5) * slotWidth;
  const py = (value: number) => baseY - (value / axisMax) * plotHeight;

  // Nhãn cách mốc (1 bỏ 1) và luôn giữ mốc cuối: 12 nhãn "MM/yy" xếp cạnh nhau
  // trên màn hình điện thoại là dính liền thành một vệt.
  const labelParity = (count - 1) % 2;

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={CHART_HEIGHT}>
        {[0, axisMax / 2, axisMax].map((tickValue) => (
          <React.Fragment key={`tick-${tickValue}`}>
            <Line
              x1={padLeft}
              y1={py(tickValue)}
              x2={padLeft + plotWidth}
              y2={py(tickValue)}
              stroke={colors.border}
              strokeWidth={0.8}
            />
            <SvgText
              x={padLeft - 4}
              y={py(tickValue) + 3}
              fontSize={labelFontSize}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {formatTick(tickValue)}
            </SvgText>
          </React.Fragment>
        ))}

        {values.map((value, index) => {
          const barHeight = value > 0 ? Math.max(1.5, baseY - py(value)) : 0;
          const isActive = index === activeIndex;

          return (
            <Rect
              key={`bar-${points[index]?.key ?? index}`}
              x={slotCenter(index) - barWidth / 2}
              y={value > 0 ? baseY - barHeight : baseY - ZERO_BAR_HEIGHT}
              width={barWidth}
              height={value > 0 ? barHeight : ZERO_BAR_HEIGHT}
              rx={2}
              // Mốc đang chọn tô đậm, các mốc còn lại nhạt hơn để mắt bám đúng
              // cột mà dòng số bên dưới đang nói tới.
              fill={
                value > 0 ? (isActive ? color : `${color}66`) : colors.border
              }
            />
          );
        })}

        <Line
          x1={padLeft}
          y1={baseY}
          x2={padLeft + plotWidth}
          y2={baseY}
          stroke={colors.borderStrong}
          strokeWidth={1.2}
        />

        {points.map((point, index) =>
          index % 2 === labelParity ? (
            <SvgText
              key={point.key}
              x={slotCenter(index)}
              y={CHART_HEIGHT - 3}
              fontSize={labelFontSize}
              fill={index === activeIndex ? colors.text : colors.textMuted}
              fontWeight={index === activeIndex ? "700" : "400"}
              textAnchor="middle"
            >
              {point.shortLabel}
            </SvgText>
          ) : null,
        )}
      </Svg>

      {/* Dải chạm trong suốt: mỗi tháng một ô, chạm đâu chọn đó — cột của tháng
          không phát sinh quá thấp để tự nhận cử chỉ. */}
      <View
        style={[styles.touchRow, { left: padLeft }]}
        pointerEvents="box-none"
      >
        {points.map((point, index) => (
          <TouchableOpacity
            key={`touch-${point.key}`}
            style={styles.touchCell}
            activeOpacity={1}
            onPress={() => onSelectIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`Tháng ${point.label}`}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * TRANG 2 của khu cuộn ngang: máy móc thêm mới theo từng tháng trong 12 tháng
 * gần nhất, kèm số luỹ kế hiện tại.
 *
 * Luỹ kế do server tính sẵn (đã gồm số dư đầu kỳ) nên ở đây CHỈ ĐỌC — tự cộng
 * dồn lại từ số phát sinh sẽ ra con số thấp hơn hẳn. Mốc cuối là THÁNG HIỆN TẠI
 * và còn đang chạy dở nên cột cuối còn tăng tiếp: đừng so cột cuối với cột trước
 * rồi kết luận "tháng này giảm".
 */
export default function HomeMachineGrowthCard({
  growth,
  totalQuantity,
  totalValue,
  chartWidth,
  isLoading = false,
  hasError = false,
  onRetry,
}: HomeMachineGrowthCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const [mode, setMode] = useState<GrowthMode>("quantity");
  const [activeIndex, setActiveIndex] = useState(-1);
  const hasGrowth = growth.length > 0;
  // Chưa chạm thì đọc mốc cuối — con số mới nhất là thứ người xem cần trước.
  const resolvedIndex =
    activeIndex >= 0 && activeIndex < growth.length
      ? activeIndex
      : growth.length - 1;
  const activePoint = hasGrowth ? growth[resolvedIndex] : null;
  const isQuantity = mode === "quantity";

  // Làm mới xong mảng đổi độ dài thì mốc đang chọn có thể không còn tồn tại.
  useEffect(() => {
    setActiveIndex(-1);
  }, [growth]);

  const series = useMemo(
    () =>
      isQuantity
        ? growth.map((point) => point.quantity)
        : growth.map((point) => point.value / HOME_BILLION),
    [growth, isQuantity],
  );

  return (
    <HomeAssetPageCard
      title="Tăng trưởng máy móc"
      note={activePoint ? activePoint.label : undefined}
    >
      {hasError && !hasGrowth ? (
        <View style={styles.errorBox}>
          <Text
            style={[styles.errorText, { color: colors.textSecondary }]}
          >
            Chưa lấy được số liệu máy móc.
          </Text>
          {onRetry ? (
            <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
              <Text style={styles.errorAction}>
                Tải lại
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : isLoading && !hasGrowth ? (
        <View
          style={[styles.skeleton, { backgroundColor: colors.surfaceAlt }]}
        />
      ) : !hasGrowth ? (
        <Text
          style={[styles.errorText, { color: colors.textSecondary }]}
        >
          Chưa có số liệu tăng trưởng máy móc.
        </Text>
      ) : (
        <View style={styles.body}>
          <Text
            style={[styles.total, { color: colors.text }]}
            numberOfLines={1}
          >
            {`Hiện có ${formatHomeNumber(
              totalQuantity,
            )} thiết bị · ${formatHomeBillion(totalValue)} tỷ`}
          </Text>

          <View style={[styles.switch, { backgroundColor: colors.surfaceAlt }]}>
            {(
              [
                { key: "quantity", label: "Số lượng" },
                { key: "value", label: "Giá trị" },
              ] as { key: GrowthMode; label: string }[]
            ).map((item) => {
              const isSelected = item.key === mode;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.switchItem,
                    isSelected && {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMode(item.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={item.label}
                >
                  <Text
                    style={[
                      styles.switchText,
                      { color: isSelected ? colors.text : colors.textMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.chartHead}>
            <Text
              style={[styles.chartTitle, { color: colors.textSecondary }]}
            >
              {isQuantity
                ? "Thêm mới trong tháng (thiết bị)"
                : "Thêm mới trong tháng (tỷ VND)"}
            </Text>
            <Text
              style={[styles.chartValue, { color: colors.text }]}
            >
              {isQuantity
                ? `+${formatHomeNumber(activePoint?.quantity ?? 0)}`
                : formatGrowthBillionDelta(activePoint?.value ?? 0)}
            </Text>
          </View>

          <GrowthBarChart
            values={series}
            points={growth}
            width={chartWidth}
            color={isQuantity ? C.blue : C.emerald}
            activeIndex={resolvedIndex}
            onSelectIndex={setActiveIndex}
            formatTick={(value) =>
              isQuantity
                ? formatHomeNumber(value)
                : formatHomeDecimal(value, value > 0 && value < 10 ? 1 : 0)
            }
          />

          <Text
            style={[styles.activeNote, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {`${activePoint?.label ?? ""}: +${formatHomeNumber(
              activePoint?.quantity ?? 0,
            )} thiết bị · ${formatGrowthBillionDelta(
              activePoint?.value ?? 0,
            )} tỷ · luỹ kế ${formatHomeNumber(
              activePoint?.cumulativeQuantity ?? 0,
            )}`}
          </Text>

          <Text
            style={[styles.note, { color: colors.textMuted }]}
          >
            {
              'Cột là máy phát sinh trong tháng; tháng hiện tại còn đang chạy dở nên cột cuối còn tăng tiếp. "Hiện có" là luỹ kế đến hết tháng, đã gồm số dư đầu kỳ (máy có ngày trước kỳ 12 tháng hoặc chưa ghi ngày sử dụng/ngày nhận).'
            }
          </Text>
        </View>
      )}
    </HomeAssetPageCard>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    body: {
      flexGrow: 1,
    },
    chartWrap: {
      position: "relative",
    },
    touchRow: {
      // `left` do chỗ dùng truyền vào: lề trái co giãn theo cỡ chữ nhãn trục.
      position: "absolute",
      right: PAD_RIGHT,
      top: 0,
      bottom: 0,
      flexDirection: "row",
    },
    touchCell: {
      flex: 1,
    },
    total: {
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.3,
      marginTop: 2,
      color: c.text,
    },
    switch: {
      flexDirection: "row",
      alignSelf: "flex-start",
      gap: 2,
      padding: 2,
      borderRadius: 10,
      marginTop: 10,
      backgroundColor: c.surfaceAlt,
    },
    switchItem: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "transparent",
    },
    switchText: {
      fontSize: 11.5,
      fontWeight: "700",
      color: c.textMuted,
    },
    chartHead: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginTop: 14,
      // Đúng 5pt giữa dòng tiêu đề và khung biểu đồ ngay dưới nó.
      marginBottom: 5,
    },
    chartTitle: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: "700",
      color: c.textSecondary,
    },
    chartValue: {
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: -0.2,
      flexShrink: 0,
      color: c.text,
    },
    activeNote: {
      fontSize: 11,
      marginTop: 8,
      fontWeight: "700",
      color: c.textSecondary,
    },
    note: {
      fontSize: 10.5,
      marginTop: 32,
      fontWeight: "600",
      color: c.textMuted,
    },
    skeleton: {
      height: CHART_HEIGHT + 60,
      borderRadius: 12,
      marginTop: 6,
      backgroundColor: c.surfaceAlt,
    },
    errorBox: {
      paddingVertical: 6,
      gap: 6,
    },
    errorText: {
      fontSize: 12.5,
      fontWeight: "600",
      color: c.textSecondary,
    },
    errorAction: {
      fontSize: 12,
      fontWeight: "700",
      color: HOME_BRAND_RED,
    },
  });
