import React from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSeparatorColor, useStyles } from "../../../utils/helpers/colors";
// Dùng lại nguyên bộ style sheet của CameraListGrid để hai modal giống nhau
// tuyệt đối, không nhân đôi định nghĩa.
import { makeStyles } from "../CameraListGrid.styles";
import {
  getPlaybackSpeedLabel,
  PLAYBACK_SPEED_OPTIONS,
  type PlaybackSpeed,
} from "./cameraPlaybackHelpers";

type PlaybackSpeedSheetProps = {
  onClose: () => void;
  onSelect: (speed: PlaybackSpeed) => void;
  selectedSpeed: PlaybackSpeed;
  visible: boolean;
};

export default function PlaybackSpeedSheet({
  onClose,
  onSelect,
  selectedSpeed,
  visible,
}: PlaybackSpeedSheetProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const separatorColor = useSeparatorColor();
  const screenDims = useWindowDimensions();
  const isLandscape = screenDims.width > screenDims.height;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.modalOverlay,
            isLandscape && styles.modalOverlayLandscape,
          ]}
        >
          <View
            style={[
              styles.sheetContainer,
              isLandscape && styles.sheetContainerLandscape,
              { paddingBottom: insets.bottom || 16 },
            ]}
          >
            <View style={styles.handleWrapper}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.sheetTitle}>
              Tốc độ phát
            </Text>
            <Text style={styles.sheetTitleChild}>
              Chọn tốc độ tua
            </Text>
            {PLAYBACK_SPEED_OPTIONS.map((speed, index) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.listItem,
                  index !== 0 && styles.itemBorder,
                  index !== 0 && { borderColor: separatorColor },
                  selectedSpeed === speed && styles.activeItem,
                ]}
                onPress={() => onSelect(speed)}
              >
                <Text
                  style={[
                    styles.listItemText,
                    selectedSpeed === speed && styles.activeText,
                  ]}
                >
                  {getPlaybackSpeedLabel(speed)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
