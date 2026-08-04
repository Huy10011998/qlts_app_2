import React from "react";
import { StyleSheet, View } from "react-native";
import HomeStatCard from "./HomeStatCard";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { HOME_FEATURE_GRID_GAP } from "../HomeScreen.styles";

export type HomeStatTile = {
  key: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
  /** Đã format sẵn theo vi-VN. */
  value: string;
  unit?: string;
  sub?: string;
  subColor?: string;
  trend?: "up" | "down" | "neutral";
  onPress?: () => void;
};

type HomeStatTilesProps = {
  tiles: HomeStatTile[];
  isLoading?: boolean;
};

const COLUMNS = 2;

/** Chia thành từng hàng 2 ô. */
const toRows = <T,>(items: T[]) => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += COLUMNS) {
    rows.push(items.slice(index, index + COLUMNS));
  }

  return rows;
};

function HomeStatTileSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.skeletonCard,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
      ]}
    >
      <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
      <View style={[styles.skeletonValue, { backgroundColor: colors.border }]} />
      <View style={[styles.skeletonLabel, { backgroundColor: colors.border }]} />
    </View>
  );
}

/**
 * Lưới 2 cột cho các con số "tổng" của toàn công ty. Ô lẻ cuối hàng được chèn
 * một ô rỗng cùng bề rộng: nếu để `flex: 1` tự giãn, ô cuối sẽ rộng gấp đôi các
 * ô trên và trông như một khối khác loại.
 */
export default function HomeStatTiles({
  tiles,
  isLoading = false,
}: HomeStatTilesProps) {
  const styles = useStyles(makeStyles);

  if (isLoading && tiles.length === 0) {
    return (
      <View style={styles.grid}>
        <View style={styles.row}>
          <HomeStatTileSkeleton />
          <HomeStatTileSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {toRows(tiles).map((row, rowIndex) => (
        <View key={`stat-row-${rowIndex}`} style={styles.row}>
          {row.map((tile) => (
            <HomeStatCard
              key={tile.key}
              value={tile.value}
              unit={tile.unit}
              label={tile.label}
              sub={tile.sub}
              subColor={tile.subColor}
              iconName={tile.iconName}
              iconBg={tile.iconBg}
              iconColor={tile.iconColor}
              trend={tile.trend}
              onPress={tile.onPress}
            />
          ))}
          {row.length < COLUMNS ? <View style={styles.filler} /> : null}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    grid: {
      gap: HOME_FEATURE_GRID_GAP,
      marginBottom: 14,
    },
    row: {
      flexDirection: "row",
      gap: HOME_FEATURE_GRID_GAP,
      alignItems: "stretch",
    },
    filler: {
      flex: 1,
    },
    skeletonCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      minHeight: 108,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
    },
    skeletonIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.border,
    },
    skeletonValue: {
      width: 66,
      height: 22,
      borderRadius: 7,
      marginTop: 12,
      backgroundColor: c.border,
    },
    skeletonLabel: {
      width: "70%",
      height: 10,
      borderRadius: 5,
      marginTop: 8,
      backgroundColor: c.border,
    },
  });
