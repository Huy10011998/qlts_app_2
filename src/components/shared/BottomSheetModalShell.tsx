import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  Modal,
  ModalProps,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { useReduceMotion } from "../../hooks/useReduceMotion";

export const SHEET_OPEN_DURATION = 240;
export const SHEET_CLOSE_DURATION = 200;
/** Bật giảm chuyển động: chỉ mờ dần, không trượt. */
export const SHEET_REDUCED_DURATION = 120;
const DEFAULT_DIM_COLOR = "rgba(0,0,0,0.4)";

type BottomSheetModalShellProps = {
  avoidKeyboard?: boolean;
  children: React.ReactNode;
  closeOnBackdropPress?: boolean;
  closeButtonStyle?: StyleProp<ViewStyle>;
  keyboardOffset?: number;
  /**
   * Bấm ra ngoài sheet. Bỏ trống thì dùng `onClose` — chỉ truyền khi nền mờ phải
   * làm việc khác với nút đóng/nút back của máy (sheet nhiều bước: nút back lùi
   * một bước, bấm ra ngoài là thoát hẳn).
   */
  onBackdropPress?: () => void;
  onClose: () => void;
  overlayStyle?: StyleProp<ViewStyle>;
  /**
   * Chừa thêm phần safe area đáy màn hình. Mặc định bật: máy tính bảng Android
   * có thanh điều hướng cao, không chừa thì đáy sheet lọt xuống dưới thanh và
   * nhìn như bị tụt quá thấp. Tắt khi nơi gọi đã tự cộng `insets.bottom`.
   */
  safeAreaBottom?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
  showCloseButton?: boolean;
  showHandle?: boolean;
  visible: boolean;
  // `animationType` cố ý KHÔNG nằm trong props: shell tự lo chuyển động để mọi
  // sheet trong app xuất hiện giống nhau. Trước đây mỗi nơi tự truyền nên sheet ở
  // Home fade tại chỗ, còn chỗ khác trượt lên.
} & Pick<ModalProps, "presentationStyle" | "statusBarTranslucent">;

export default function BottomSheetModalShell({
  avoidKeyboard = false,
  children,
  closeOnBackdropPress = false,
  closeButtonStyle,
  keyboardOffset = 0,
  onBackdropPress,
  onClose,
  overlayStyle,
  safeAreaBottom = true,
  sheetStyle,
  showCloseButton = false,
  showHandle = false,
  visible,
  presentationStyle = "overFullScreen",
  // Mặc định phủ cả vùng status bar: trên Android, Modal không bật cờ này chỉ
  // trải trong phần nội dung, nên nền mờ hụt một dải ở đỉnh màn hình và sheet
  // nhìn như đang mở lệch.
  statusBarTranslucent = true,
}: BottomSheetModalShellProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const insets = useSafeAreaInsets();

  /**
   * Modal phải còn render trong lúc sheet trượt ra, nên trạng thái hiển thị thật
   * là state nội bộ này chứ không phải prop `visible`. Khởi tạo bằng `visible` để
   * sheet mount ở trạng thái đã mở thì hiện ngay, không trượt lên gây chớp.
   */
  const [isRendered, setIsRendered] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  /**
   * Mỗi lần đổi trạng thái tăng token. Callback của animation đối chiếu token
   * trước khi ẩn Modal — không có nó, mở lại ngay sau khi đóng sẽ bị callback của
   * lần đóng cũ tắt mất.
   */
  const runIdRef = useRef(0);
  // Chưa đọc xong cờ thì coi như bình thường: sheet chỉ mở khi người dùng bấm,
  // lúc đó cờ đã đọc xong từ lâu.
  const noMotion = useReduceMotion() === true;

  const windowHeight = useWindowDimensions().height;
  const sheetHeightRef = useRef(0);
  const isAnimatingRef = useRef(false);
  /**
   * Khoảng sheet phải trượt. Chỉ cập nhật khi KHÔNG đang animate: đổi giữa
   * animation thì `translateY` nội suy ra giá trị khác ngay lập tức và sheet nhảy
   * một đoạn. Lần mở đầu chưa đo được thì đi trọn chiều cao màn hình — nhanh hơn
   * một chút nhưng không giật, và không bao giờ kẹt ở trạng thái ẩn.
   */
  const [travel, setTravel] = useState(windowHeight);

  const isFirstRunRef = useRef(true);

  useEffect(() => {
    // Lần render đầu: `isRendered` và `progress` đã khởi tạo đúng theo `visible`,
    // animate nữa là chớp một nhịp.
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    runIdRef.current += 1;
    const runId = runIdRef.current;

    if (visible) {
      setIsRendered(true);
      // Chốt khoảng trượt cho lượt này, dùng số đo mới nhất nếu đã có.
      if (sheetHeightRef.current > 0) {
        setTravel(sheetHeightRef.current + insets.bottom);
      }
    }

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: noMotion
        ? SHEET_REDUCED_DURATION
        : visible
        ? SHEET_OPEN_DURATION
        : SHEET_CLOSE_DURATION,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    isAnimatingRef.current = true;
    animation.start(({ finished }) => {
      isAnimatingRef.current = false;

      // `finished === false` khi bị stop (đóng/mở dồn, hoặc unmount) — lúc đó
      // không được ẩn Modal, và cũng không được setState sau unmount.
      if (!finished) return;
      // Bỏ qua nếu đã có lượt mở/đóng mới hơn.
      if (runIdRef.current !== runId) return;
      if (!visible) setIsRendered(false);
    });

    return () => animation.stop();
  }, [insets.bottom, noMotion, progress, visible]);

  useEffect(() => {
    if (!avoidKeyboard || !visible) {
      setKeyboardHeight(0);
      return;
    }

    const handleKeyboardShow = (e: KeyboardEvent) => {
      const nextHeight = Math.max(
        0,
        e.endCoordinates.height - insets.bottom + keyboardOffset,
      );

      setKeyboardHeight((prev) => {
        // Khi keyboard da mo roi, giu nguyen vi tri sheet den luc keyboard dong han.
        // Viec doi focus giua cac input tren iOS thuong ban them event show/frame
        // va gay giat modal neu tiep tuc cap nhat marginBottom.
        if (prev > 0) {
          return prev;
        }
        return nextHeight;
      });
    };
    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [avoidKeyboard, insets.bottom, keyboardOffset, visible]);

  const maxVisibleOffset = Math.max(
    0,
    overlayHeight - sheetHeight - insets.top - 12,
  );
  const sheetMarginBottom =
    keyboardHeight > 0 ? Math.min(keyboardHeight, maxVisibleOffset) : 0;

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    // Giảm chuyển động: không trượt, chỉ để nền và sheet mờ dần.
    outputRange: [noMotion ? 0 : travel, 0],
  });

  // Màu nền mờ do từng nơi gọi tự đặt qua `overlayStyle`; tách riêng để gán cho
  // lớp có animate, phần còn lại (bố cục) giữ ở khung ngoài.
  const { backgroundColor: dimColor = DEFAULT_DIM_COLOR, ...overlayLayout } =
    (StyleSheet.flatten(overlayStyle) ?? {}) as ViewStyle;

  return (
    <Modal
      transparent
      animationType="none"
      visible={isRendered}
      onRequestClose={onClose}
      presentationStyle={presentationStyle}
      statusBarTranslucent={statusBarTranslucent}
    >
      {/* Nền mờ nằm riêng một lớp để fade độc lập: gộp vào lớp bố cục thì
          `opacity` sẽ fade luôn cả sheet. */}
      <Animated.View
        testID="sheet-dim"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dimColor, opacity: progress },
        ]}
      />

      <View
        style={[styles.layout, overlayLayout]}
        onLayout={(event) => {
          setOverlayHeight(event.nativeEvent.layout.height);
        }}
      >
        {closeOnBackdropPress ? (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onBackdropPress ?? onClose}
          />
        ) : (
          <View style={styles.backdrop} />
        )}

        {/* marginBottom trên sheet — chỉ đẩy sheet lên, backdrop không bị ảnh hưởng */}
        <Animated.View
          testID="sheet-surface"
          style={[
            styles.sheet,
            sheetStyle,
            sheetMarginBottom > 0 && { marginBottom: sheetMarginBottom },
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;

            sheetHeightRef.current = height;
            setSheetHeight(height);
            if (!isAnimatingRef.current && height > 0) {
              setTravel(height + insets.bottom);
            }
          }}
        >
          {showCloseButton ? (
            <TouchableOpacity
              style={[styles.closeButton, closeButtonStyle]}
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          ) : null}
          {showHandle ? <View style={styles.handle} /> : null}
          {children}
          {safeAreaBottom && insets.bottom > 0 ? (
            <View style={{ height: insets.bottom }} />
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    layout: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: c.surface,
    },
    closeButton: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 2,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceAlt,
    },
    handle: {
      width: 45,
      height: 5,
      backgroundColor: c.borderStrong,
      borderRadius: 3,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 12,
    },
  });
