import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  /** `null` là đóng. */
  uri: string | null;
  onClose: () => void;
};

/** Xem ảnh gốc toàn màn hình, chạm nền hoặc nút X để đóng. */
export default function ImagePreviewModal({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={Boolean(uri)}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : null}
      </Pressable>

      <View style={[styles.closeWrap, { top: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng ảnh"
          hitSlop={12}
        >
          <Ionicons name="close" size={34} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "80%" },
  closeWrap: { position: "absolute", right: 16 },
});
