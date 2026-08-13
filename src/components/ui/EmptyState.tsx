import { useAppColors } from "../../utils/helpers/colors";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type EmptyStateProps = {
  iconName?: string;
  title: string;
  subtitle?: string;
  fullHeight?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  /** Nút hành động dưới phần chữ, ví dụ "Xoá từ khoá" hay "Thử lại". */
  actionLabel?: string;
  onActionPress?: () => void;
};

export default function EmptyState({
  iconName,
  title,
  subtitle,
  fullHeight = true,
  style,
  titleStyle,
  subtitleStyle,
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  const colors = useAppColors();

  return (
    <View style={[styles.wrap, fullHeight && styles.fullHeight, style]}>
      {iconName ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.surface, shadowColor: colors.shadow },
          ]}
        >
          <Ionicons name={iconName as any} size={32} color={colors.textMuted} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.textSecondary }, titleStyle]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.subtitle, { color: colors.textSub }, subtitleStyle]}
        >
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          style={[
            styles.action,
            { backgroundColor: colors.redSurface, borderColor: colors.redBorder },
          ]}
          onPress={onActionPress}
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, { color: colors.red }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  fullHeight: {
    flex: 1,
    justifyContent: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  action: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
