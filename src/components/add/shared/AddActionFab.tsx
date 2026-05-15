import React, { memo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../../utils/helpers/colors";

const FAB_SIZE = 64;
const FAB_OFFSET = 16;

type AddActionFabProps = {
  label?: string;
  onPress: () => void;
  variant?: "icon" | "extended";
};

function AddActionFabComponent({
  label = "Thêm mới",
  onPress,
  variant = "icon",
}: AddActionFabProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + FAB_OFFSET;
  const isExtended = variant === "extended";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={[styles.fab, isExtended ? styles.extendedFab : styles.iconFab, { bottom }]}
    >
      {isExtended ? (
        <>
          <View style={styles.iconWrap}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
          <Text style={styles.label}>{label}</Text>
        </>
      ) : (
        <Ionicons name="add" size={34} color="#fff" />
      )}
    </TouchableOpacity>
  );
}

export default memo(AddActionFabComponent);

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: FAB_OFFSET,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#1A2340",
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
        }
      : {
          elevation: 10,
        }),
  },
  iconFab: {
    width: FAB_SIZE,
  },
  extendedFab: {
    minWidth: 148,
    paddingHorizontal: 18,
    flexDirection: "row",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
