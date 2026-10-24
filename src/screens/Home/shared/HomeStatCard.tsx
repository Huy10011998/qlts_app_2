import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { getTextScaleFactor } from "../../../utils/helpers/textScaling";
import { useHomeCardChrome } from "./homeBlockTone";

/**
 * Bề rộng tối thiểu để nhãn đứng cạnh icon. Ô hẹp hơn (màn nhỏ, bật Thu phóng,
 * chữ to) thì nhãn xuống dưới icon thay vì bị cắt còn "Thiết bị máy m…".
 */
const INLINE_LABEL_MIN_WIDTH = 88;

const makeTrendStyles = (c: AppColors) =>
  StyleSheet.create({
    up: {
      backgroundColor: c.greenLight,
    },
    down: {
      backgroundColor: c.redSurface,
    },
  });

type HomeStatCardProps = {
  value: string;
  /** Đơn vị đứng cạnh con số, ví dụ "MWh". */
  unit?: string;
  label: string;
  sub?: string;
  subColor?: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  onPress?: () => void;
};

export default function HomeStatCard({
  value,
  unit,
  label,
  sub,
  subColor,
  iconName,
  iconBg,
  iconColor,
  trend,
  onPress,
}: HomeStatCardProps) {
  const trendStyles = useStyles(makeTrendStyles);
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const chrome = useHomeCardChrome();
  const resolvedSubColor = subColor ?? c.textMuted;
  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, chrome, { backgroundColor: c.surface }]}
      activeOpacity={0.78}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value} ${unit ?? ""}`}
    >
      <View style={styles.top}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} color={iconColor} size={16} />
          </View>
          <Text
            style={[styles.label, { color: c.textSecondary }]}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
        {trend === "up" ? (
          <View style={[styles.trendBadge, trendStyles.up]}>
            <Ionicons name="trending-up" size={10} color={c.emerald} />
          </View>
        ) : null}
        {trend === "down" ? (
          <View style={[styles.trendBadge, trendStyles.down]}>
            <Ionicons name="trending-down" size={10} color={c.red} />
          </View>
        ) : null}
      </View>
      {/* Ô bấm được trông y như ô chữ tĩnh thì không ai nghĩ ra mà bấm — mũi
          tên chỉ có ở ô mở được màn khác. Nằm đè ở góc chứ không đứng trong
          hàng tiêu đề: đứng trong hàng thì nó ăn mất chỗ của nhãn, "Thiết bị
          CNTT đang dùng" bị cắt còn "Thiết bị CNTT đang…". */}
      {onPress ? (
        <View style={styles.chevronWrap} pointerEvents="none">
          <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
        </View>
      ) : null}
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, { color: iconColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[styles.unit, { color: iconColor }]}
            numberOfLines={1}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {sub ? (
        <Text
          style={[styles.sub, { color: resolvedSubColor }]}
          numberOfLines={2}
        >
          {sub}
        </Text>
      ) : null}
    </Wrapper>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Viền, bóng và mép trên màu nhóm do `useHomeCardChrome` lo.
    card: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingTop: 12,
      paddingBottom: 14,
      paddingLeft: 14,
      paddingRight: 10,
    },
    top: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      // Chừa chỗ cho mũi tên › nằm đè ở góc phải.
      paddingRight: 12,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    // Cao bằng ô icon và cùng mép trên với hàng tiêu đề (paddingTop của card)
    // để mũi tên nằm ngang tâm icon.
    chevronWrap: {
      position: "absolute",
      top: 12,
      right: 6,
      height: 34,
      justifyContent: "center",
    },
    trendBadge: {
      width: 22,
      height: 22,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
      maxWidth: "100%",
    },
    value: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5,
      flexShrink: 1,
    },
    unit: {
      fontSize: 12,
      fontWeight: "700",
      flexShrink: 0,
    },
    label: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: "700",
      flex: 1,
      minWidth: INLINE_LABEL_MIN_WIDTH * getTextScaleFactor(),
    },
    sub: {
      fontSize: 11.5,
      marginTop: 5,
      fontWeight: "600",
    },
  });
