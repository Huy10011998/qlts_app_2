import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";

type Props = {
  onPress: () => void;
  icon?: string;
  /** Màn nằm trong tab có thanh tab bên dưới: đã có khoảng đệm, không cộng safe area. */
  insideTab?: boolean;
};

/** Nút tròn nổi góc phải dưới — thêm mới. */
export default function WorkflowFab({ onPress, icon = "add", insideTab }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.fab, { bottom: (insideTab ? 0 : insets.bottom) + 20 }]}
    >
      <Ionicons name={icon} size={28} color={C.onBrand} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    ...elevation("#000000", 3),
    shadowOpacity: 0.25,
    elevation: 6,
  },
});
