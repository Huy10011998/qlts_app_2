import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  type AlertButton,
  type AlertOptions,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { FullWindowOverlay } from "react-native-screens";

import {
  AppColors,
  C,
  useSchemeColor,
  useStyles,
} from "../../utils/helpers/colors";
import {
  getTextScaleFactor,
  scaledLineHeight,
} from "../../utils/helpers/textScaling";

type AlertRequest = {
  key: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

let enqueueListener: ((request: Omit<AlertRequest, "key">) => void) | null =
  null;

/** Cho nút Back của `Modal` Android gọi vào hộp đang hiện. */
const cardDismissRef: { current: (() => void) | null } = { current: null };

/**
 * Hộp thông báo tự vẽ, gọi y như `Alert.alert` của React Native.
 *
 * Hộp gốc của hệ điều hành phóng chữ theo cỡ chữ điện thoại, trong khi cả app đã
 * bỏ qua cỡ chữ máy (xem `textScaling.ts`): máy để chữ to nhất thì hộp gốc to quá
 * khổ, lệch hẳn với màn phía sau. Hộp này dùng `Text` của app nên chỉ theo thanh
 * Cài đặt › Cỡ chữ, và iOS với Android trông như nhau.
 *
 * Gọi được từ bất kỳ đâu, kể cả ngoài component. Chưa có `AppAlertHost` (jest,
 * hay lúc app chưa dựng xong cây) thì rơi về hộp gốc để không nuốt mất thông báo.
 */
export const AppAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) {
    if (!enqueueListener) {
      Alert.alert(title, message, buttons, options);
      return;
    }

    enqueueListener({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: "OK" }],
      options,
    });
  },
};

type ButtonVariant = "primary" | "danger" | "neutral" | "option";

/**
 * Huỷ → viền xám; Xoá (destructive) → tô đỏ; nút hành động cuối cùng → tô đỏ;
 * các lựa chọn còn lại (kiểu "Chi tiết / Thử lại / Huỷ") → viền chữ đỏ.
 */
const getVariants = (buttons: AlertButton[]): ButtonVariant[] => {
  const hasDestructive = buttons.some((b) => b.style === "destructive");
  let lastDefault = -1;

  buttons.forEach((b, i) => {
    if (b.style !== "cancel" && b.style !== "destructive") lastDefault = i;
  });

  return buttons.map((b, i) => {
    if (b.style === "cancel") return "neutral";
    if (b.style === "destructive") return "danger";
    return !hasDestructive && i === lastDefault ? "primary" : "option";
  });
};

const CARD_MAX_WIDTH = 340;
const CARD_PADDING_X = 20;
const BUTTON_GAP = 10;
const BUTTON_PADDING_X = 16;
const BUTTON_FONT_SIZE = 15;
/** Bề rộng trung bình một ký tự tiếng Việt, tính theo cỡ chữ — ước hơi rộng tay. */
const AVG_CHAR_WIDTH_EM = 0.56;

/**
 * Hai nút nằm ngang khi nhãn vừa một dòng trong nửa thẻ; không thì xếp dọc.
 * Phải tính theo cỡ chữ của app: ở 1.5x, "Bỏ thay đổi" đã gãy hai dòng trong
 * nút viên.
 */
const fitsInRow = (buttons: AlertButton[], cardWidth: number) => {
  if (buttons.length !== 2) return false;

  const labelWidth =
    (cardWidth - CARD_PADDING_X * 2 - BUTTON_GAP) / 2 - BUTTON_PADDING_X * 2;
  const charWidth =
    BUTTON_FONT_SIZE * getTextScaleFactor() * AVG_CHAR_WIDTH_EM;

  return buttons.every(
    (b) => (b.text ?? "OK").length * charWidth <= labelWidth,
  );
};

const OPEN_MS = 180;
const CLOSE_MS = 130;

/**
 * Đặt một lần ở gốc app, cạnh `AppToastHost`.
 *
 * iOS phải vẽ trong `FullWindowOverlay`: `<Modal>` của React Native được trình
 * bày từ view controller gốc, nên Modal đặt ở gốc app không hiện được khi đang
 * có Modal khác mở (bộ chọn, form thêm nhanh…) — mà hộp thông báo hay bật ra
 * đúng lúc đó. Android thì Dialog sau chồng lên Dialog trước bình thường.
 */
export function AppAlertHost() {
  const [queue, setQueue] = useState<AlertRequest[]>([]);
  const current = queue[0];

  useEffect(() => {
    let seq = 0;

    // Đang có hộp thì hộp mới xếp hàng chờ, như hộp gốc của iOS.
    enqueueListener = (request) =>
      setQueue((prev) => [...prev, { ...request, key: ++seq }]);

    return () => {
      enqueueListener = null;
    };
  }, []);

  const handleClosed = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  if (!current) return null;

  const card = (
    <AlertCard key={current.key} request={current} onClosed={handleClosed} />
  );

  if (Platform.OS === "ios") {
    return (
      <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
        {card}
      </FullWindowOverlay>
    );
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        // Nút Back: như hộp gốc Android, chỉ đóng khi nơi gọi cho phép.
        if (current.options?.cancelable) cardDismissRef.current?.();
      }}
    >
      {card}
    </Modal>
  );
}

function AlertCard({
  request,
  onClosed,
}: {
  request: AlertRequest;
  onClosed: () => void;
}) {
  const styles = useStyles(makeStyles);
  const optionText = useSchemeColor(C.red, C.redLight);
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const { title, message, buttons, options } = request;

  useEffect(() => {
    // Lớp phủ iOS nằm dưới cửa sổ bàn phím; hộp gốc cũng hạ bàn phím xuống.
    Keyboard.dismiss();
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  /** Ẩn hộp xong mới chạy `after`, để nó mở hộp khác / Modal / goBack thoải mái. */
  const close = useCallback(
    (after?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;

      Animated.timing(progress, {
        toValue: 0,
        duration: CLOSE_MS,
        useNativeDriver: true,
      }).start(() => {
        onClosed();
        after?.();
      });
    },
    [onClosed, progress],
  );

  const dismiss = useCallback(() => {
    close(options?.onDismiss);
  }, [close, options?.onDismiss]);

  useEffect(() => {
    cardDismissRef.current = dismiss;

    return () => {
      if (cardDismissRef.current === dismiss) cardDismissRef.current = null;
    };
  }, [dismiss]);

  const variants = getVariants(buttons);
  const entries = buttons.map((button, index) => ({
    button,
    variant: variants[index],
    index,
  }));
  const cardWidth = Math.min(CARD_MAX_WIDTH, width - 48);
  const isRow = fitsInRow(buttons, cardWidth);
  // Hàng ngang: Huỷ bên trái. Xếp dọc: Huỷ dưới cùng.
  const ordered = [...entries].sort((a, b) => {
    const aCancel = a.button.style === "cancel" ? 1 : 0;
    const bCancel = b.button.style === "cancel" ? 1 : 0;

    return isRow ? bCancel - aCancel : aCancel - bCancel;
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={false}
          onPress={options?.cancelable ? dismiss : undefined}
        />
      </Animated.View>

      <Animated.View
        accessibilityRole="alert"
        accessibilityViewIsModal
        style={[
          styles.card,
          { width: cardWidth, opacity: progress },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.title}>{title}</Text>

        {message ? (
          <ScrollView
            style={[styles.messageScroll, { maxHeight: height * 0.5 }]}
            bounces={false}
          >
            <Text style={styles.message}>{message}</Text>
          </ScrollView>
        ) : null}

        <View style={[styles.buttons, isRow && styles.buttonsRow]}>
          {ordered.map(({ button, variant, index }) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              onPress={() => close(() => button.onPress?.())}
              style={({ pressed }) => [
                styles.button,
                isRow && styles.buttonInRow,
                variant === "primary" || variant === "danger"
                  ? styles.buttonFilled
                  : variant === "option"
                    ? styles.buttonOption
                    : styles.buttonNeutral,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.buttonLabel,
                  variant === "primary" || variant === "danger"
                    ? styles.buttonLabelFilled
                    : variant === "option"
                      ? { color: optionText }
                      : styles.buttonLabelNeutral,
                ]}
              >
                {button.text ?? "OK"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(9, 17, 27, 0.5)",
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      // Chế độ tối: thẻ và nền mờ gần cùng độ sáng, cần mép để tách ra.
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.separator,
      paddingTop: 22,
      paddingHorizontal: CARD_PADDING_X,
      paddingBottom: 18,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
    },
    messageScroll: {
      flexGrow: 0,
      marginTop: 8,
    },
    message: {
      fontSize: 14.5,
      lineHeight: scaledLineHeight(14.5, 1.42),
      color: c.textSecondary,
    },
    buttons: {
      marginTop: 20,
      gap: BUTTON_GAP,
    },
    buttonsRow: {
      flexDirection: "row",
    },
    button: {
      minHeight: 44,
      borderRadius: 999,
      paddingHorizontal: BUTTON_PADDING_X,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonInRow: {
      flex: 1,
    },
    buttonFilled: {
      backgroundColor: C.red,
    },
    buttonOption: {
      borderWidth: 1,
      borderColor: c.redBorder,
      backgroundColor: c.redSurface,
    },
    buttonNeutral: {
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonLabel: {
      fontSize: BUTTON_FONT_SIZE,
      fontWeight: "600",
      textAlign: "center",
    },
    buttonLabelFilled: {
      color: C.onBrand,
      fontWeight: "700",
    },
    buttonLabelNeutral: {
      color: c.text,
    },
  });
