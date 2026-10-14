import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import type { ThongBaoItem } from "../../types/index";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { elevation } from "../../utils/helpers/tokens";
import { tint } from "../Workflow/shared/workflowConstants";
import { getNhomLabel, getThongBaoStyle, ICON_BG_ALPHA } from "./thongBaoRules";

const SHOW_MS = 5000;
const FADE_MS = 180;

type Props = {
  item: ThongBaoItem | null;
  onPress: (item: ThongBaoItem) => void;
  onDismiss: () => void;
};

/**
 * Toast khi có "ThongBaoMoi" (mục 3) — nổi trên đầu màn đang mở, tự ẩn sau
 * vài giây; bấm vào = bấm thông báo (đánh dấu đọc + mở đối tượng).
 */
export default function ThongBaoToast({ item, onPress, onDismiss }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!item) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
        ({ finished }) => finished && onDismiss(),
      );
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [item, onDismiss, opacity]);

  if (!item) return null;
  const style = getThongBaoStyle(item);

  return (
    <Animated.View
      style={[styles.wrap, { top: insets.top + 8, opacity }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [styles.toast, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Thông báo mới. ${item.tieuDe ?? ""}`}
      >
        <View style={[styles.icon, { backgroundColor: tint(style.color, ICON_BG_ALPHA) }]}>
          <MaterialIcons name={style.icon} size={20} color={style.color} />
        </View>
        <View style={styles.body}>
          <Text style={styles.nhom} numberOfLines={1}>
            {getNhomLabel(item.nhom)}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.tieuDe}
          </Text>
          {item.noiDung ? (
            <Text style={styles.content} numberOfLines={1}>
              {item.noiDung}
            </Text>
          ) : null}
        </View>
        <Pressable hitSlop={10} onPress={onDismiss} accessibilityLabel="Đóng">
          <Ionicons name="close" size={18} color={c.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 12,
      right: 12,
    },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      ...elevation(c.shadow, 3),
    },
    pressed: {
      opacity: 0.85,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      flex: 1,
    },
    nhom: {
      fontSize: 11,
      color: c.textSub,
    },
    title: {
      fontSize: 13.5,
      fontWeight: "700",
      color: c.text,
    },
    content: {
      fontSize: 12.5,
      color: c.textSecondary,
      marginTop: 1,
    },
  });
