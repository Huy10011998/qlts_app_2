import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  ModalProps,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type BottomSheetModalShellProps = {
  avoidKeyboard?: boolean;
  children: React.ReactNode;
  closeOnBackdropPress?: boolean;
  onClose: () => void;
  overlayStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
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
  onClose,
  overlayStyle,
  sheetStyle,
  showHandle = false,
  visible,
  animationType = "slide",
  presentationStyle,
  statusBarTranslucent,
}: BottomSheetModalShellProps) {
  const [keyboardBottom, setKeyboardBottom] = useState(0);

  useEffect(() => {
    if (!avoidKeyboard || !visible) {
      setKeyboardBottom(0);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardBottom(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardBottom(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [avoidKeyboard, visible]);

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
        style={[
          styles.overlay,
          keyboardBottom ? { paddingBottom: keyboardBottom } : null,
          overlayStyle,
        ]}
      >
        {closeOnBackdropPress ? (
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        ) : (
          <View style={styles.backdrop} />
        )}

        <View style={[styles.sheet, sheetStyle]}>
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
