import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { C } from "../../../utils/helpers/colors";

type IconLib = "ionicons" | "material-community";

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
  isLast,
}: SettingRowItemProps) {
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <SettingItemIcon
        iconName={iconName}
        lib={lib}
        bg={danger ? C.rose : iconBg ?? C.red}
      />
      <View style={styles.textCol}>
        <Text style={[styles.label, danger && { color: C.rose }]}>{label}</Text>
        {sublabel ? <Text style={styles.sub}>{sublabel}</Text> : null}
      </View>
      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </View>
    </TouchableOpacity>
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
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <SettingItemIcon iconName={iconName} lib={lib} bg={iconBg ?? C.red} />
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {sublabel ? <Text style={styles.sub}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#DDE1EA", true: C.red }}
        thumbColor="#fff"
        ios_backgroundColor="#DDE1EA"
      />
    </View>
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
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 14.5,
    fontWeight: "600",
    color: C.text,
    letterSpacing: 0.1,
  },
  sub: {
    fontSize: 11.5,
    color: C.textSub,
    marginTop: 2,
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.border,
    borderRadius: 7,
  },
});
