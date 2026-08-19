import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { HomeDashboardUtility } from "./homeData";
import { formatHomeCount, HOME_NO_DATA } from "./homeFormat";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";

export type HomeUtilityRow = HomeDashboardUtility & {
  iconBg: string;
  iconColor: string;
};

type HomeUtilityCardProps = {
  rows: HomeUtilityRow[];
  /** Kỳ số liệu, ví dụ "Tháng 7/2026". */
  periodLabel?: string;
  isLoading?: boolean;
};

/** Số dòng khung chờ — bằng đúng số đại lượng mapper dựng ra (xem `homeData`). */
const UTILITY_ROW_COUNT = 5;

export default function HomeUtilityCard({
  rows,
  periodLabel,
  isLoading = false,
}: HomeUtilityCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const separatorColor = useSeparatorColor();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: hairlineBorderColor,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {isLoading && rows.length === 0
        ? Array.from({ length: UTILITY_ROW_COUNT }).map((_, index) => (
            <View
              key={`utility-skeleton-${index}`}
              style={[
                styles.row,
                { borderBottomColor: separatorColor },
                index === UTILITY_ROW_COUNT - 1 && styles.rowLast,
              ]}
            >
              <View style={styles.headRow}>
                <View
                  style={[styles.iconWrap, { backgroundColor: colors.border }]}
                />
                <View
                  style={[
                    styles.skeletonLabel,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonValue,
                    { backgroundColor: colors.border },
                  ]}
                />
              </View>
              <View
                style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
              />
            </View>
          ))
        : rows.map((row, index) => {
            const decimals = row.decimals ?? 0;
            // Cả hai nhà máy đều null -> không vẽ vạch, không hiện 0.
            const hasData = row.total != null;
            const vinhLocShare =
              hasData && row.total ? ((row.vinhLoc ?? 0) / row.total) * 100 : 0;

            return (
              <View
                key={row.key}
                style={[
                  styles.row,
                  { borderBottomColor: separatorColor },
                  index === rows.length - 1 && styles.rowLast,
                ]}
                accessibilityLabel={`${row.label}: ${formatHomeCount(
                  row.total,
                  decimals,
                )} ${row.unit}`}
              >
                <View style={styles.headRow}>
                  <View
                    style={[styles.iconWrap, { backgroundColor: row.iconBg }]}
                  >
                    <Ionicons
                      name={row.iconName}
                      size={17}
                      color={row.iconColor}
                    />
                  </View>

                  <Text
                    style={[styles.label, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {row.label}
                  </Text>

                  <View style={styles.valueRow}>
                    <Text
                      style={[styles.value, { color: colors.text }]}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {formatHomeCount(row.total, decimals)}
                    </Text>
                    <Text
                      style={[styles.unit, { color: colors.textMuted }]}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {row.unit}
                    </Text>
                  </View>
                </View>

                {hasData ? (
                  <>
                    <View
                      style={[
                        styles.track,
                        { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <View
                        style={[
                          styles.trackFill,
                          {
                            backgroundColor: row.iconColor,
                            width: `${vinhLocShare}%`,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.trackFill,
                          {
                            backgroundColor: colors.slate,
                            width: `${100 - vinhLocShare}%`,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.plantRow}>
                      <View style={styles.plantItem}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: row.iconColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.plantText,
                            { color: colors.textMuted },
                          ]}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {`VL ${formatHomeCount(row.vinhLoc, decimals)}`}
                        </Text>
                      </View>
                      <View style={styles.plantItem}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: colors.slate },
                          ]}
                        />
                        <Text
                          style={[
                            styles.plantText,
                            { color: colors.textMuted },
                          ]}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {`BL ${formatHomeCount(row.benLuc, decimals)}`}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <Text
                    style={[styles.emptyNote, { color: colors.textMuted }]}
                    allowFontScaling={false}
                  >
                    Kỳ này chưa chốt chỉ số đồng hồ
                  </Text>
                )}
              </View>
            );
          })}

      {periodLabel ? (
        <Text
          style={[styles.footer, { color: colors.textMuted }]}
          allowFontScaling={false}
        >
          {`${periodLabel} (kỳ tháng trước) · VL = Vĩnh Lộc, BL = Bến Lức · ${HOME_NO_DATA} = chưa có số liệu`}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 4,
      paddingBottom: 10,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    row: {
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    label: {
      flex: 1,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "600",
      color: c.textSecondary,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 3,
      flexShrink: 0,
    },
    value: {
      fontSize: 17,
      lineHeight: 21,
      fontWeight: "800",
      letterSpacing: -0.3,
      includeFontPadding: false,
      color: c.text,
    },
    unit: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
    },
    track: {
      flexDirection: "row",
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      marginTop: 9,
      backgroundColor: c.surfaceAlt,
    },
    trackFill: {
      height: "100%",
    },
    plantRow: {
      flexDirection: "row",
      gap: 14,
      marginTop: 6,
    },
    plantItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flexShrink: 1,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    plantText: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      color: c.textMuted,
    },
    emptyNote: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "600",
      marginTop: 7,
      color: c.textMuted,
    },
    skeletonLabel: {
      flex: 1,
      height: 11,
      borderRadius: 5,
      backgroundColor: c.border,
    },
    skeletonValue: {
      width: 58,
      height: 16,
      borderRadius: 6,
      backgroundColor: c.border,
    },
    footer: {
      fontSize: 10.5,
      lineHeight: 14,
      fontWeight: "600",
      textAlign: "right",
      marginTop: 8,
      color: c.textMuted,
    },
  });
