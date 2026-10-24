import React, { useContext } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  C,
  useAppColors,
  useSeparatorColor,
} from "../../../utils/helpers/colors";
import { ROW_DIVIDER_OPACITY } from "../../../utils/helpers/tokens";
import { SettingSectionAccentContext } from "./SettingSectionGroup";

type IconLib = "ionicons" | "material-community";

const SETTING_ROW_PADDING_HORIZONTAL = 16;

/**
 * Vạch ngăn dưới dòng: trong nhóm có `accent` thì cùng tông màu viền card nhưng
 * nhạt (`ROW_DIVIDER_OPACITY`), ngoài ra xám mảnh.
 */
function useRowSeparatorStyle(): ViewStyle {
  const separatorColor = useSeparatorColor();
  const accent = useContext(SettingSectionAccentContext);

  return accent
    ? { backgroundColor: accent, height: 1, opacity: ROW_DIVIDER_OPACITY }
    : { backgroundColor: separatorColor };
}

type SettingRowBaseProps = {
  iconName: string;
  label: string;
  sublabel?: string;
  lib?: IconLib;
  iconBg?: string;
  isLast?: boolean;
};

type SettingRowItemProps = SettingRowBaseProps & {
  onPress: () => void;
  danger?: boolean;
  /** Nhãn nhỏ nổi bật cạnh mũi tên, vd báo có bản cập nhật. */
  badge?: string;
  disabled?: boolean;
};

type SettingSwitchRowProps = SettingRowBaseProps & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingItemIcon({
  iconName,
  lib = "ionicons",
  bg,
}: {
  iconName: string;
  lib?: IconLib;
  bg: string;
}) {
  return (
    <View style={[styles.iconWrap, { backgroundColor: bg }]}>
      {lib === "material-community" ? (
        <MaterialCommunityIcons name={iconName} size={18} color="#fff" />
      ) : (
        <Ionicons name={iconName} size={18} color="#fff" />
      )}
    </View>
  );
}

export function SettingRowItem({
  iconName,
  label,
  sublabel,
  onPress,
  lib,
  iconBg,
  danger,
  badge,
  disabled,
  isLast,
}: SettingRowItemProps) {
  const colors = useAppColors();
  const separatorStyle = useRowSeparatorStyle();

  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
      >
        <SettingItemIcon
          iconName={iconName}
          lib={lib}
          bg={danger ? C.rose : iconBg ?? C.red}
        />
        <View style={styles.textCol}>
          <Text
            style={[styles.label, { color: danger ? C.rose : colors.text }]}
          >
            {label}
          </Text>
          {sublabel ? (
            <Text style={[styles.sub, { color: colors.textSub }]}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <View style={[styles.chevronWrap, { backgroundColor: colors.border }]}>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      {isLast ? null : <View style={[styles.separator, separatorStyle]} />}
    </>
  );
}

export function SettingSwitchRow({
  iconName,
  label,
  sublabel,
  value,
  onValueChange,
  lib,
  iconBg,
  isLast,
}: SettingSwitchRowProps) {
  const colors = useAppColors();
  const separatorStyle = useRowSeparatorStyle();

  return (
    <>
      <View style={styles.row}>
        <SettingItemIcon iconName={iconName} lib={lib} bg={iconBg ?? C.red} />
        <View style={styles.textCol}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          {sublabel ? (
            <Text style={[styles.sub, { color: colors.textSub }]}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.borderStrong, true: C.red }}
          thumbColor="#fff"
          ios_backgroundColor={colors.borderStrong}
        />
      </View>
      {isLast ? null : <View style={[styles.separator, separatorStyle]} />}
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: SETTING_ROW_PADDING_HORIZONTAL,
  },
  // Thụt vào bằng lề ngang của dòng: vạch thẳng mép icon và mũi tên, không
  // chạm viền card.
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SETTING_ROW_PADDING_HORIZONTAL,
  },
  textCol: {
    flex: 1,
  },
  // Không đặt `lineHeight` / `includeFontPadding: false`: React Native không
  // scale lineHeight theo cỡ chữ hệ thống, và includeFontPadding cắt phần đệm
  // glyph trên Android — cả hai đều xén dấu tiếng Việt khi người dùng để cỡ
  // chữ lớn. Để platform tự tính leading theo cỡ chữ đã scale.
  label: {
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  sub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  badge: {
    marginLeft: 8,
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.red,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10.5,
    fontWeight: "700",
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
});
