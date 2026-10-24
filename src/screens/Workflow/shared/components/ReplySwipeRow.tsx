import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";

/** Kéo quá chừng này px rồi thả = trả lời. */
const REPLY_THRESHOLD = 56;
/** Kéo tiếp quá ngưỡng thì tin chỉ nhích thêm chút (cảm giác "chạm đáy"). */
const MAX_DRAG = REPLY_THRESHOLD + 16;

/** Rung nhẹ khi vào chế độ trả lời (giữ tin / kéo qua ngưỡng). */
export const replyHaptic = () => {
  try {
    ReactNativeHapticFeedback.trigger("impactLight", {
      enableVibrateFallback: false,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};

type Props = {
  /** Tin của mình (dồn phải) thì kéo sang trái, tin người khác kéo sang phải. */
  mine: boolean;
  enabled: boolean;
  onReply: () => void;
  children: React.ReactNode;
};

/**
 * Vuốt 1 tin về phía giữa màn để trả lời như Messenger (7-Mobile-Realtime-
 * BinhLuan mục 7): icon ↩ hiện dần theo tay, qua ngưỡng thì rung, thả tay thì
 * tin trượt về chỗ cũ và mở khung "Đang trả lời". Kéo dọc vẫn là cuộn danh sách.
 *
 * Dự án không cài reanimated nên cử chỉ chạy ở luồng JS (runOnJS) và lái
 * Animated thường.
 */
export default function ReplySwipeRow({ mine, enabled, onReply, children }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const passedRef = useRef(false);
  const onReplyRef = useRef(onReply);
  useEffect(() => {
    onReplyRef.current = onReply;
  }, [onReply]);

  const dir = mine ? -1 : 1;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(enabled)
        // Chỉ nhận kéo về phía giữa màn; kéo dọc nhường cho danh sách cuộn.
        .activeOffsetX(dir * 15)
        .failOffsetX(-dir * 15)
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          const raw = Math.max(0, event.translationX * dir);
          const drag = raw <= REPLY_THRESHOLD ? raw : REPLY_THRESHOLD + (raw - REPLY_THRESHOLD) * 0.25;
          translateX.setValue(Math.min(drag, MAX_DRAG) * dir);
          const passed = raw >= REPLY_THRESHOLD;
          if (passed && !passedRef.current) replyHaptic();
          passedRef.current = passed;
        })
        .onEnd(() => {
          if (passedRef.current) onReplyRef.current();
        })
        .onFinalize(() => {
          passedRef.current = false;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start();
        }),
    [dir, enabled, translateX],
  );

  const iconOpacity = translateX.interpolate({
    inputRange: mine ? [-REPLY_THRESHOLD, -16, 0] : [0, 16, REPLY_THRESHOLD],
    outputRange: mine ? [1, 0, 0] : [0, 0, 1],
    extrapolate: "clamp",
  });
  const iconScale = translateX.interpolate({
    inputRange: mine ? [-REPLY_THRESHOLD, 0] : [0, REPLY_THRESHOLD],
    outputRange: mine ? [1, 0.5] : [0.5, 1],
    extrapolate: "clamp",
  });

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.icon,
            mine ? styles.iconMine : styles.iconOther,
            { opacity: iconOpacity, transform: [{ scale: iconScale }] },
          ]}
        >
          <Ionicons name="arrow-undo" size={16} color={c.accent} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    icon: {
      position: "absolute",
      top: "50%",
      marginTop: -16,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentLight,
    },
    iconOther: {
      left: 0,
    },
    iconMine: {
      right: 0,
    },
  });
