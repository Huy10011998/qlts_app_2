import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeFeatureStyles } from "../FeaturesScreen.styles";

export type FeatureTileGroup = "feature" | "vehicle" | "report";

type FeatureTileProps = {
  iconName: string;
  label: string;
  notificationCount?: number;
  group?: FeatureTileGroup;
  onPress?: () => void;
};

/**
 * Một ô trong danh mục Chức năng: icon tròn nền nhạt, tên bên dưới.
 *
 * Khác card của Trang chủ (có viền, có vạch màu, cao cố định): ở đây một màn có
 * thể hiện vài chục ô, nên bỏ hết khung để mắt bám vào icon và chữ, còn thẻ
 * trắng của cả nhóm mới là thứ đóng khung.
 */
export default function FeatureTile({
  iconName,
  label,
  notificationCount,
  group = "feature",
  onPress,
}: FeatureTileProps) {
  const styles = useStyles(makeFeatureStyles);
  const colors = useAppColors();

  const accentByGroup = {
    feature: { iconBg: colors.redSurface, color: colors.red },
    vehicle: { iconBg: colors.blueSurface, color: colors.sky },
    report: { iconBg: colors.violetSurface, color: colors.violet },
  };
  const accent = accentByGroup[group];

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: accent.iconBg }]}>
        <Ionicons name={iconName} color={accent.color} size={24} />
        {notificationCount ? (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>
              {notificationCount}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={styles.tileLabel}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
