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
import { AppColors, useStyles } from "../../../utils/helpers/colors";

const FAB_SIZE = 64;
const FAB_OFFSET = 16;
let cachedBottomInset = 0;

type AddActionFabProps = {
  label?: string;
  onPress: () => void;
  variant?: "icon" | "extended";
  /**
   * Icon Ionicons trong nút. Mặc định dấu cộng — đổi khi hành động chính của
   * màn không phải "thêm một bản ghi" (vd chụp ảnh xác nhận, quét mã QR).
   */
  iconName?: string;
};

function AddActionFabComponent({
  label = "Thêm mới",
  onPress,
  variant = "icon",
  iconName = "add",
}: AddActionFabProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const stableBottomInsetRef = React.useRef(
    Math.max(cachedBottomInset, insets.bottom),
  );
  const bottomInset = Math.max(
    stableBottomInsetRef.current,
    cachedBottomInset,
    insets.bottom,
  );

  if (bottomInset !== stableBottomInsetRef.current) {
    stableBottomInsetRef.current = bottomInset;
  }
  if (bottomInset !== cachedBottomInset) {
    cachedBottomInset = bottomInset;
  }

  const bottom = stableBottomInsetRef.current + FAB_OFFSET;
  const isExtended = variant === "extended";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={[
        styles.fab,
        isExtended ? styles.extendedFab : styles.iconFab,
        { bottom },
      ]}
    >
      {isExtended ? (
        <>
          <View style={styles.iconWrap}>
            <Ionicons name={iconName} size={22} color="#fff" />
          </View>
          <Text style={styles.label} allowFontScaling={false}>
            {label}
          </Text>
        </>
      ) : (
        <Ionicons name={iconName} size={34} color="#fff" />
      )}
    </TouchableOpacity>
  );
}

export default memo(AddActionFabComponent);

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      right: FAB_OFFSET,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: c.red,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "ios"
        ? {
            shadowColor: c.shadow,
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
