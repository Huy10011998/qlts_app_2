import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Line, Path } from "react-native-svg";

import { useThemePreference } from "../../../../context/ThemeContext";
import type { FlowTraBuoc } from "../../../../types/index";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { FLOW_TRA_BUOC_COLOR } from "../../shared/workflowConstants";
import { formatBeDate } from "../../shared/workflowDate";
import {
  bareFlowName,
  FLOW_CHIP_COLOR,
  FLOW_LINE_COLOR,
  FLOW_POINT_COLOR,
  FlowDiagram,
  FlowPoint,
} from "../flowProcessRules";
import { AppAlert } from "../../../../components/ui/AppAlert";

type Props = {
  diagram: FlowDiagram;
  selectedKey: string | null;
  onSelect: (point: FlowPoint) => void;
};

/** Mỗi cột tối thiểu ~130 (mục 6, "Màn hẹp"): rộng hơn màn thì cuộn ngang. */
const MIN_COL_W = 130;
const DOT = 30;
/** Đủ chỗ: chấm + tên 2 dòng + dòng "x/n" + dòng ngày giờ. */
export const FLOW_DIAGRAM_ROW_H = 126;
const ROW_H = FLOW_DIAGRAM_ROW_H;
/** Dải giữa 2 lượt chạy — chỗ cho nét đứt cam + nhãn "↩ Trả bước". */
const GAP_H = 46;
const PAD_X = 8;
const PAD_TOP = 8;

/** Giữ nhãn trả bước (web: rê chuột): bước trả → bước về, người, ngày, lý do. */
const showTraBuoc = (tra: FlowTraBuoc) =>
  AppAlert.alert(
    "Trả bước",
    [
      [tra.tenBuocTu, tra.tenBuocVe].filter(Boolean).join(" → "),
      [bareFlowName(tra.iD_NhanVien_MoTa), formatBeDate(tra.ngayTra, true)].filter(Boolean).join(" · "),
      tra.lyDo ? `Lý do: ${tra.lyDo}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

const pointIcon = (point: FlowPoint): string | null => {
  switch (point.state) {
    case "done":
      return "checkmark";
    case "reject":
      return "close";
    case "skip":
      return "remove";
    case "tra":
      return "arrow-undo";
    default:
      return point.column.kind === "congViec" ? "briefcase-outline" : null;
  }
};

const pointName = (point: FlowPoint) => {
  const { column } = point;
  if (column.kind === "lap") return "Lập phiếu";
  if (column.kind === "congViec") return `Công việc ${column.link.soCongViec ?? ""}`.trim();
  return column.buoc.ten;
};

/**
 * Sơ đồ ngang (mục 6a–d): cột = Lập phiếu / bước lớn / Công việc, dòng = lượt
 * chạy. Vẽ bằng một lớp Svg cho đường nối + nét đứt cam, các điểm là ô bấm
 * được nằm đúng toạ độ cột / dòng.
 */
export default function FlowProcessDiagram({ diagram, selectedKey, onSelect }: Props) {
  const styles = useStyles(makeStyles);
  const { width: windowWidth } = useWindowDimensions();
  // Nhãn trả bước chữ #b26a00 như web; giao diện tối giữ cam sáng cho đọc được.
  const traLabelColor =
    useThemePreference().resolvedColorScheme === "dark" ? FLOW_TRA_BUOC_COLOR : FLOW_CHIP_COLOR.tra.text;

  const colCount = diagram.columns.length;
  // Trừ lề ScrollView (12 × 2) của màn.
  const colW = Math.max(MIN_COL_W, Math.floor((windowWidth - 24) / Math.max(colCount, 1)));
  const width = colW * colCount;
  const height = diagram.runs.length * ROW_H + (diagram.runs.length - 1) * GAP_H;

  const colLeft = (col: number) => col * colW;
  const rowTop = (run: number) => run * (ROW_H + GAP_H);
  const dotX = (col: number) => colLeft(col) + PAD_X + DOT / 2;
  const dotY = (run: number) => rowTop(run) + PAD_TOP + DOT / 2;

  // Điểm đang chọn bị khuất (sơ đồ rộng hơn màn) thì cuộn tới giữa — mở màn là
  // thấy ngay điểm đang xử lý, bấm nhãn trả bước là thấy điểm bấm trả.
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const viewportRef = useRef(0);
  const selected = diagram.runs.flatMap((run) => run.points).find((point) => point.key === selectedKey);
  const selectedCol = selected?.col ?? null;

  const revealSelected = () => {
    if (selectedCol == null || !viewportRef.current) return;
    const left = colLeft(selectedCol);
    const right = left + colW;
    const offset = offsetRef.current;
    if (left >= offset && right <= offset + viewportRef.current) return;
    const x = Math.max(0, Math.min(left - (viewportRef.current - colW) / 2, width - viewportRef.current));
    scrollRef.current?.scrollTo({ x, animated: true });
  };

  useEffect(revealSelected, [selectedCol, colW, width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      scrollEventThrottle={32}
      onScroll={(event) => {
        offsetRef.current = event.nativeEvent.contentOffset.x;
      }}
      onLayout={(event) => {
        viewportRef.current = event.nativeEvent.layout.width;
        revealSelected();
      }}
    >
      <View style={{ width, height }}>
        {/* Ô đang chọn: nền nhạt sau điểm. */}
        {diagram.runs.flatMap((run) =>
          run.points
            .filter((point) => point.key === selectedKey)
            .map((point) => (
              <View
                key={`sel-${point.key}`}
                style={[
                  styles.selected,
                  { left: colLeft(point.col) + 2, top: rowTop(run.index) + 2, width: colW - 4, height: ROW_H - 4 },
                ]}
              />
            )),
        )}

        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {diagram.runs.flatMap((run) =>
            run.points.slice(0, -1).map((point, index) => {
              const next = run.points[index + 1];
              return (
                <Line
                  key={`line-${point.key}`}
                  x1={dotX(point.col) + DOT / 2 + 4}
                  y1={dotY(run.index)}
                  x2={dotX(next.col) - DOT / 2 - 4}
                  y2={dotY(run.index)}
                  stroke={point.passed ? FLOW_LINE_COLOR.passed : FLOW_LINE_COLOR.other}
                  strokeWidth={2}
                />
              );
            }),
          )}
          {diagram.runs.slice(0, -1).map((run) => {
            const tra = run.points.find((point) => point.state === "tra") ?? run.points[run.points.length - 1];
            const nextStart = diagram.runs[run.index + 1]?.points[0];
            if (!tra || !nextStart) return null;
            const xa = dotX(tra.col);
            const xb = dotX(nextStart.col);
            const yTop = rowTop(run.index) + ROW_H - 6;
            const yMid = rowTop(run.index) + ROW_H + GAP_H / 2 + 4;
            const yEnd = rowTop(run.index + 1) + PAD_TOP - 2;
            return (
              <React.Fragment key={`tra-${run.index}`}>
                <Path
                  d={`M ${xa} ${yTop} V ${yMid} H ${xb} V ${yEnd - 5}`}
                  stroke={FLOW_TRA_BUOC_COLOR}
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                  fill="none"
                />
                <Path
                  d={`M ${xb - 5} ${yEnd - 7} L ${xb} ${yEnd} L ${xb + 5} ${yEnd - 7} Z`}
                  fill={FLOW_TRA_BUOC_COLOR}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {diagram.runs.flatMap((run) =>
          run.points.map((point) => {
            const color = FLOW_POINT_COLOR[point.state];
            const icon = pointIcon(point);
            const number = point.column.kind === "buoc" ? point.column.buoc.buoc : null;
            return (
              <TouchableOpacity
                key={point.key}
                activeOpacity={0.7}
                onPress={() => onSelect(point)}
                style={[styles.cell, { left: colLeft(point.col), top: rowTop(run.index), width: colW }]}
                accessibilityRole="button"
                accessibilityLabel={[pointName(point), point.count, point.sub].filter(Boolean).join(", ")}
              >
                <View style={[styles.dotWrap, point.state === "doing" && { backgroundColor: `${color}33` }]}>
                  <View
                    style={[
                      styles.dot,
                      point.state === "wait"
                        ? styles.dotWait
                        : { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    {icon ? (
                      <Ionicons name={icon} size={point.state === "tra" ? 15 : 17} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.dotNumber, point.state === "wait" && styles.dotNumberWait]}>
                        {number ?? ""}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.name,
                    point.state === "tra" && { color: FLOW_TRA_BUOC_COLOR },
                    point.state === "doing" && { color },
                  ]}
                  numberOfLines={2}
                >
                  {pointName(point)}
                </Text>
                {point.count != null ? (
                  <View style={styles.subRow}>
                    {point.childDots.map((dot) => (
                      <View
                        key={dot.id}
                        style={[styles.childDot, { backgroundColor: FLOW_POINT_COLOR[dot.state] }]}
                      />
                    ))}
                    <Text style={styles.count}>{point.count}</Text>
                  </View>
                ) : null}
                {/* Ngày giờ dòng riêng cho đọc trọn; cỡ chữ lớn thì co lại thay vì cắt "…". */}
                {point.sub ? (
                  <Text style={styles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {point.sub}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          }),
        )}

        {/* Nhãn nét đứt chỉ ghi "↩ Trả bước" (không số lần). Bấm là chọn điểm bấm
            trả của lượt đó — khung chi tiết + bảng có người, giờ, lý do; giữ là
            xem nhanh bước trả → bước về, người, ngày, lý do. */}
        {diagram.runs.slice(0, -1).map((run) => {
          const tra = run.points.find((point) => point.state === "tra");
          const nextStart = diagram.runs[run.index + 1]?.points[0];
          const traBuoc = run.traBuoc;
          if (!tra || !nextStart || !traBuoc) return null;
          const left = Math.min(dotX(tra.col), dotX(nextStart.col)) + 6;
          const span = Math.max(Math.abs(dotX(tra.col) - dotX(nextStart.col)) - 12, colW - 12);
          return (
            <TouchableOpacity
              key={`tra-label-${run.index}`}
              activeOpacity={0.7}
              onPress={() => onSelect(tra)}
              onLongPress={() => showTraBuoc(traBuoc)}
              delayLongPress={350}
              style={[styles.traLabel, { left, width: span, top: rowTop(run.index) + ROW_H + 2 }]}
              accessibilityRole="button"
              accessibilityLabel={`Trả bước: ${[traBuoc.tenBuocTu, traBuoc.tenBuocVe].filter(Boolean).join(" → ")}`}
            >
              {/* Icon thay cho ký tự ↩ — iOS vẽ ký tự đó thành emoji ô xanh. */}
              <Ionicons name="arrow-undo" size={12} color={traLabelColor} />
              <Text style={[styles.traLabelText, { color: traLabelColor }]} numberOfLines={1}>
                Trả bước
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    scroll: {
      paddingVertical: 4,
    },
    selected: {
      position: "absolute",
      borderRadius: 12,
      backgroundColor: c.accentLight,
    },
    cell: {
      position: "absolute",
      height: ROW_H,
      paddingTop: PAD_TOP - 4,
      paddingHorizontal: PAD_X - 4,
    },
    dotWrap: {
      width: DOT + 8,
      height: DOT + 8,
      borderRadius: (DOT + 8) / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    dotWait: {
      backgroundColor: c.surface,
      borderColor: FLOW_POINT_COLOR.wait,
      borderStyle: "dashed",
    },
    dotNumber: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    dotNumberWait: {
      color: c.textSub,
    },
    name: {
      marginTop: 4,
      paddingRight: 4,
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 3,
      paddingRight: 4,
    },
    childDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    count: {
      marginLeft: 2,
      fontSize: 11.5,
      color: c.textSub,
    },
    sub: {
      marginTop: 3,
      paddingRight: 4,
      fontSize: 11.5,
      color: c.textSub,
    },
    traLabel: {
      position: "absolute",
      height: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    traLabelText: {
      flexShrink: 1,
      fontSize: 11.5,
      fontWeight: "700",
    },
  });
