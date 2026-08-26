import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

export type InlineToastTone = "success" | "warning";

type InlineToastProps = {
  /** Nhãn nút phụ bên phải (ví dụ "Xem"). Thiếu thì không có nút. */
  actionLabel?: string;
  /** Dòng phụ, ví dụ mã bản ghi vừa lưu. */
  detail?: string;
  durationMs?: number;
  /** Nội dung chính; rỗng/null là không hiện gì. */
  message?: string | null;
  onAction?: () => void;
  /** Gọi khi dải đã ẩn hẳn — nơi gọi dọn state ở đây. */
  onDismiss: () => void;
  /** "warning" cho tin cần đọc kỹ hơn, ví dụ giải thích vì sao không làm được việc đang chọn. */
  tone?: InlineToastTone;
};

const DEFAULT_DURATION_MS = 4000;
const FADE_MS = 180;

/**
 * Dải thông báo không chặn màn, thay cho `Alert` "Tạo mới thành công!" ở những
 * luồng làm việc liên tục: bấm OK cho mỗi bản ghi là một thao tác thừa khi người
 * dùng đang quét hàng loạt.
 *
 * Tự ẩn sau `durationMs`; có nút thì đợi lâu hơn không giúp gì vì nút cũng chỉ
 * là đường tắt, việc chính đã xong.
 */
export default function InlineToast({
  actionLabel,
  detail,
  durationMs = DEFAULT_DURATION_MS,
  message,
  onAction,
  onDismiss,
  tone = "success",
}: InlineToastProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const isWarning = tone === "warning";
  const accent = isWarning ? c.amber : c.green;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, opacity]);

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(hide, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [durationMs, hide, message, opacity]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="box-none">
      <View style={[styles.banner, isWarning && styles.bannerWarning]}>
        <Ionicons
          name={isWarning ? "alert-circle" : "checkmark-circle"}
          size={18}
          color={accent}
        />

        <View style={styles.textWrap}>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>

        {actionLabel && onAction ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              onDismiss();
              onAction();
            }}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={[styles.actionLabel, { color: accent }]}>
              {actionLabel}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={accent} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.greenLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.greenBorder,
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 11,
    },
    textWrap: {
      flex: 1,
    },
    message: {
      fontSize: 12.5,
      color: c.text,
      fontWeight: "600",
    },
    detail: {
      fontSize: 11.5,
      color: c.textSub,
      marginTop: 1,
    },
    bannerWarning: {
      backgroundColor: c.amberLight,
      borderColor: c.amberBorder,
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingVertical: 3,
      paddingLeft: 6,
    },
    actionPressed: {
      opacity: 0.6,
    },
    actionLabel: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.green,
    },
  });
