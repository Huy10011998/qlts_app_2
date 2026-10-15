import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { cvDashboard } from "../../../services/data/congViecApi";
import { useAppSelector } from "../../../store/hooks";
import type { CongViecDashboard } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import ProgressRing from "../shared/components/ProgressRing";
import { tint } from "../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  DASHBOARD_SERIES,
  DASHBOARD_STATUS,
  getDashboardCount,
  getDashboardMax,
  getDashboardMonths,
  getMonthDelta,
  getStatusShare,
} from "./workflowDashboardRules";

type Props = {
  /** Đổi giá trị (Trang chủ vừa làm mới) là tải lại. */
  reloadKey?: string;
};

const CHART_HEIGHT = 96;
const BAR_WIDTH = 10;

/**
 * Khối "Tổng quan công việc" ở Trang chủ (cv-dashboard, 4-Mobile-CongViec mục
 * 10): % hoàn tất năm, tháng này so với tháng trước, 4 ô trạng thái và cột 6
 * tháng (Số việc · Hoàn thành, chung một trục). Bấm một tháng để xem số của
 * tháng đó — thay cho tooltip trên web.
 *
 * Tự tải: lúc hiện, khi Trang chủ làm mới (`reloadKey`), sau mỗi thao tác ghi
 * Workflow và khi quay lại app. Mọi hook nằm trong khối này, HomeScreen chỉ đặt.
 */
export default function WorkflowDashboardCard({ reloadKey }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const version = useAppSelector((state) => state.workflow.version);
  const [data, setData] = useState<CongViecDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await cvDashboard());
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được tổng quan công việc."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey, version]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") load();
    });
    return () => subscription.remove();
  }, [load]);

  const months = useMemo(() => getDashboardMonths(data), [data]);
  const max = useMemo(() => getDashboardMax(months), [months]);

  if (loading && !data) {
    return (
      <View style={styles.card}>
        <View style={[styles.skeleton, { height: 64 }]} />
        <View style={[styles.skeleton, { height: 56, marginTop: 12 }]} />
        <View style={[styles.skeleton, { height: CHART_HEIGHT, marginTop: 12 }]} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Ionicons name="cloud-offline-outline" size={20} color={c.textSub} />
        <Text style={styles.errorText}>{errorMessage ?? "Chưa có dữ liệu công việc."}</Text>
        <TouchableOpacity onPress={load} hitSlop={8}>
          <Text style={styles.retry}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tongQuan: NonNullable<CongViecDashboard["tongQuan"]> = data.tongQuan ?? {};
  const delta = getMonthDelta(tongQuan.soThangNay, tongQuan.soThangTruoc);
  const selected = months.find((month) => month.key === selectedKey) ?? months[months.length - 1];
  const allZero = months.every((month) => !month.soViec && !month.soHoanThanh);
  const percentYear =
    tongQuan.phanTramHoanTatNam == null ? null : Math.round(Number(tongQuan.phanTramHoanTatNam));
  const statusTotal = DASHBOARD_STATUS.reduce(
    (sum, status) => sum + getDashboardCount(tongQuan[status.key]),
    0,
  );
  const deltaColor =
    delta.trend === "up" ? "#2e7d32" : delta.trend === "down" ? "#c62828" : c.textSub;

  return (
    <View style={styles.card}>
      {/* Chữ y hệt Home web: "Bạn đã hoàn tất 15% công việc trong năm", "Tháng
          hiện tại", "+200% so với tháng trước (3)". */}
      <View style={styles.heroRow}>
        <ProgressRing percent={percentYear} size={52} strokeWidth={5} />
        <Text style={styles.heroLabel}>
          Bạn đã hoàn tất <Text style={styles.heroStrong}>{percentYear ?? "-"}%</Text> công việc
          trong năm
        </Text>
      </View>
      <View style={styles.monthRow}>
        <Text style={styles.monthValue}>{getDashboardCount(tongQuan.soThangNay)}</Text>
        <View style={styles.monthBody}>
          <Text style={styles.monthTitle}>Tháng hiện tại</Text>
          <Text style={styles.deltaText}>
            <Text style={[styles.deltaValue, { color: deltaColor }]}>{delta.value}</Text> so với
            tháng trước ({getDashboardCount(tongQuan.soThangTruoc)})
          </Text>
        </View>
      </View>

      <View style={styles.statusGrid}>
        {DASHBOARD_STATUS.map((status) => {
          const value = getDashboardCount(tongQuan[status.key]);
          return (
            <View key={status.key} style={styles.statusItem}>
              {/* Hai dòng thay vì cắt "…": màn hẹp (bật Thu phóng) hay chữ to thì
                  nhãn dài như "Quá hạn (tháng này)" vẫn không nuốt mất con số. */}
              <Text style={styles.statusLabel} numberOfLines={2}>
                {status.label}: <Text style={styles.statusValue}>{value}</Text>
              </Text>
              <View style={[styles.statusTrack, { backgroundColor: tint(status.color, "33") }]}>
                <View
                  style={[
                    styles.statusFill,
                    {
                      width: `${getStatusShare(value, statusTotal) * 100}%`,
                      backgroundColor: status.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>6 tháng gần nhất</Text>
        <View style={styles.legend}>
          {Object.values(DASHBOARD_SERIES).map((series) => (
            <View key={series.label} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: series.color }]} />
              <Text style={styles.legendText}>{series.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {allZero ? (
        <Text style={styles.empty}>Chưa có việc trong 6 tháng gần nhất.</Text>
      ) : (
        <>
          <View style={styles.chart}>
            {months.map((month) => {
              const isSelected = month.key === selected?.key;
              return (
                <TouchableOpacity
                  key={month.key}
                  activeOpacity={0.7}
                  onPress={() => setSelectedKey(month.key)}
                  style={[styles.column, isSelected && styles.columnSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Tháng ${month.label}: ${month.soViec} việc, ${month.soHoanThanh} hoàn thành`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.bars}>
                    {(["soViec", "soHoanThanh"] as const).map((key) => (
                      <View
                        key={key}
                        style={[
                          styles.bar,
                          {
                            height: (month[key] / max) * CHART_HEIGHT,
                            backgroundColor: DASHBOARD_SERIES[key].color,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  {/* Sáu cột chia đều bề ngang: màn hẹp hay chữ to thì "10/26" co lại
                      cho vừa cột, không tràn sang dính vào nhãn bên cạnh. */}
                  <Text
                    style={[styles.monthLabel, isSelected && styles.monthLabelSelected]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {month.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selected ? (
            <Text style={styles.caption}>
              Tháng {selected.label}: {selected.soViec} việc · {selected.soHoanThanh} hoàn thành
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    skeleton: {
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
    },
    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: c.textSub,
    },
    retry: {
      fontSize: 13,
      fontWeight: "700",
      color: c.red,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    heroLabel: {
      flex: 1,
      fontSize: 13.5,
      color: c.textSecondary,
    },
    heroStrong: {
      fontWeight: "800",
      color: c.text,
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
    },
    monthValue: {
      minWidth: 52,
      textAlign: "center",
      fontSize: 30,
      fontWeight: "800",
      color: c.text,
    },
    monthBody: {
      flex: 1,
    },
    monthTitle: {
      fontSize: 13,
      color: c.textSub,
    },
    deltaText: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    deltaValue: {
      fontWeight: "800",
    },
    statusGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 14,
      rowGap: 12,
      marginTop: 16,
    },
    statusItem: {
      flexBasis: "45%",
      flexGrow: 1,
      // Nhãn một ô xuống hai dòng thì thanh tỉ lệ vẫn thẳng hàng với ô bên cạnh.
      justifyContent: "space-between",
    },
    statusLabel: {
      fontSize: 13,
      color: c.textSecondary,
    },
    statusValue: {
      fontWeight: "800",
      color: c.text,
    },
    statusTrack: {
      height: 5,
      borderRadius: 3,
      marginTop: 6,
      overflow: "hidden",
    },
    statusFill: {
      height: "100%",
      borderRadius: 3,
    },
    chartHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginTop: 16,
      marginBottom: 8,
    },
    chartTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendText: {
      fontSize: 11.5,
      color: c.textSub,
    },
    chart: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    column: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      paddingTop: 6,
      borderRadius: 8,
    },
    columnSelected: {
      backgroundColor: c.accentLight,
    },
    bars: {
      flexDirection: "row",
      alignItems: "flex-end",
      // 2px khe nền giữa hai cột cạnh nhau.
      gap: 2,
      height: CHART_HEIGHT,
    },
    bar: {
      width: BAR_WIDTH,
      // Đầu cột bo 4px, chân cột vuông — bám đường gốc.
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    monthLabel: {
      fontSize: 10.5,
      color: c.textSub,
      marginTop: 4,
      marginBottom: 4,
    },
    monthLabelSelected: {
      color: c.text,
      fontWeight: "700",
    },
    caption: {
      fontSize: 12.5,
      color: c.textSecondary,
      marginTop: 8,
    },
    empty: {
      fontSize: 13,
      color: c.textSub,
      paddingVertical: 12,
    },
  });
