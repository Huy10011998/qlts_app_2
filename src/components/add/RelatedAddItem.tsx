import React, { memo } from "react";
import { TouchableOpacity, StyleSheet, Platform, View, Text } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FAB_SIZE = 64;
const FAB_OFFSET = 16;

type Props = {
  onPress: () => void;
};

function RelatedAddItemComponent({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + FAB_OFFSET;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Thêm mới"
      hitSlop={12}
      style={[styles.fab, { bottom }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="add" size={22} color="#fff" />
      </View>
      <Text style={styles.label}>Thêm mới</Text>
    </TouchableOpacity>
  );
}

export const RelatedAddItem = memo(RelatedAddItemComponent);

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: FAB_OFFSET,
    height: FAB_SIZE,
    minWidth: 148,
    paddingHorizontal: 18,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#E31E24",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
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
