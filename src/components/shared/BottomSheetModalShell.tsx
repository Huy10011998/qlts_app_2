import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardEvent,
  Modal,
  ModalProps,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";

type BottomSheetModalShellProps = {
  avoidKeyboard?: boolean;
  children: React.ReactNode;
  closeOnBackdropPress?: boolean;
  closeButtonStyle?: StyleProp<ViewStyle>;
  keyboardOffset?: number;
  onClose: () => void;
  overlayStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  showCloseButton?: boolean;
  showHandle?: boolean;
  visible: boolean;
} & Pick<
  ModalProps,
  "animationType" | "presentationStyle" | "statusBarTranslucent"
>;

export default function BottomSheetModalShell({
  avoidKeyboard = false,
  children,
  closeOnBackdropPress = false,
  closeButtonStyle,
  keyboardOffset = 0,
  onClose,
  overlayStyle,
  sheetStyle,
  showCloseButton = false,
  showHandle = false,
  visible,
  animationType = "slide",
  presentationStyle,
  statusBarTranslucent,
}: BottomSheetModalShellProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const insets = useSafeAreaInsets();

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

  return (
    <Modal
      transparent
      animationType={animationType}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle={presentationStyle}
      statusBarTranslucent={statusBarTranslucent}
    >
      <View
        style={[styles.overlay, overlayStyle]}
        onLayout={(event) => {
          setOverlayHeight(event.nativeEvent.layout.height);
        }}
      >
        {closeOnBackdropPress ? (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
        ) : (
          <View style={styles.backdrop} />
        )}

        {/* marginBottom trên sheet — chỉ đẩy sheet lên, backdrop không bị ảnh hưởng */}
        <View
          style={[
            styles.sheet,
            sheetStyle,
            sheetMarginBottom > 0 && { marginBottom: sheetMarginBottom },
          ]}
          onLayout={(event) => {
            setSheetHeight(event.nativeEvent.layout.height);
          }}
        >
          {showCloseButton ? (
            <TouchableOpacity
              style={[styles.closeButton, closeButtonStyle]}
              hitSlop={10}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
          {showHandle ? <View style={styles.handle} /> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#fff",
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
    backgroundColor: "#F3F4F6",
  },
  handle: {
    width: 45,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
});
