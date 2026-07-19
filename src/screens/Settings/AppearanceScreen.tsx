import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useThemePreference } from "../../context/ThemeContext";
import { useColorScheme } from "../../hooks/useColorScheme";

const RED = "#E31E24";

type AppearanceOptionProps = {
  mode: "light" | "dark";
  label: string;
  selected: boolean;
  disabled: boolean;
  textColor: string;
  onPress: () => void;
};

function AppearancePreview({
  mode,
  label,
  selected,
  disabled,
  textColor,
  onPress,
}: AppearanceOptionProps) {
  const dark = mode === "dark";
  const previewBackground = dark ? "#20242B" : "#F4F5F7";
  const previewCard = dark ? "#343A44" : "#FFFFFF";
  const previewText = dark ? "#EDF1F7" : "#202632";

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        disabled && styles.optionDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View style={[styles.preview, { backgroundColor: previewBackground }]}>
        <View style={[styles.previewTop, { backgroundColor: previewCard }]}>
          <View
            style={[
              styles.previewAvatar,
              dark ? styles.previewMutedDark : styles.previewAvatarLight,
            ]}
          />
          <View style={styles.previewLines}>
            <View
              style={[styles.previewLineWide, { backgroundColor: previewText }]}
            />
            <View
              style={[
                styles.previewLineShort,
                dark ? styles.previewMutedDark : styles.previewLineLight,
              ]}
            />
          </View>
        </View>
        <View style={styles.previewGrid}>
          {[
            "#AEBBC5",
            "#F5D565",
            "#ED9363",
            "#5FD6A0",
            "#8998EA",
            "#7EC4E8",
          ].map((color, index) => (
            <View
              key={color}
              style={[
                styles.previewTile,
                { backgroundColor: dark && index !== 1 ? `${color}C0` : color },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export default function AppearanceScreen() {
  const isDark = useColorScheme() === "dark";
  const { preference, setPreference } = useThemePreference();
  const followsSystem = preference === "system";

  const colors = isDark
    ? {
        background: "#090D13",
        card: "#171D26",
        text: "#F5F7FB",
        secondary: "#9AA7B7",
        border: "#293442",
      }
    : {
        background: "#F2F4F8",
        card: "#FFFFFF",
        text: "#131A24",
        secondary: "#778393",
        border: "#E2E7EE",
      };

  const toggleFollowSystem = (enabled: boolean) => {
    if (enabled) {
      setPreference("system");
      return;
    }

    setPreference(isDark ? "dark" : "light");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
        Hình thức
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View accessibilityRole="radiogroup" style={styles.optionsRow}>
          <AppearancePreview
            mode="light"
            label="Sáng"
            selected={followsSystem ? !isDark : preference === "light"}
            disabled={followsSystem}
            textColor={colors.text}
            onPress={() => setPreference("light")}
          />
          <AppearancePreview
            mode="dark"
            label="Tối"
            selected={followsSystem ? isDark : preference === "dark"}
            disabled={followsSystem}
            textColor={colors.text}
            onPress={() => setPreference("dark")}
          />
        </View>

        <View style={[styles.systemRow, { borderTopColor: colors.border }]}>
          <View style={styles.systemTextWrap}>
            <Text style={[styles.systemLabel, { color: colors.text }]}>
              Sử dụng cài đặt của thiết bị
            </Text>
            <Text
              style={[styles.systemDescription, { color: colors.secondary }]}
            >
              Tự động đổi giao diện theo cài đặt hiển thị trên thiết bị của bạn.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Sử dụng cài đặt giao diện của thiết bị"
            value={followsSystem}
            onValueChange={toggleFollowSystem}
            trackColor={{ false: colors.border, true: RED }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 20,
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 24,
  },
  option: { alignItems: "center", width: 128 },
  optionDisabled: { opacity: 0.52 },
  optionPressed: { opacity: 0.72 },
  preview: {
    width: 94,
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
  },
  previewTop: {
    height: 72,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  previewAvatar: { width: 24, height: 24, borderRadius: 12 },
  previewAvatarLight: { backgroundColor: "#DCE1E8" },
  previewMutedDark: { backgroundColor: "#687284" },
  previewLines: { flex: 1, marginLeft: 8, gap: 6 },
  previewLineWide: { height: 5, borderRadius: 3, opacity: 0.7 },
  previewLineShort: { width: "70%", height: 4, borderRadius: 2 },
  previewLineLight: { backgroundColor: "#CED4DC" },
  previewGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  previewTile: { width: "33.333%", height: "50%" },
  optionLabel: { marginTop: 12, fontSize: 16, fontWeight: "600" },
  radio: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#8B96A5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  radioSelected: { backgroundColor: RED, borderColor: RED },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  systemRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  systemTextWrap: { flex: 1, paddingRight: 12 },
  systemLabel: { fontSize: 15.5, lineHeight: 22, fontWeight: "700" },
  systemDescription: { marginTop: 5, fontSize: 12.5, lineHeight: 18 },
});
