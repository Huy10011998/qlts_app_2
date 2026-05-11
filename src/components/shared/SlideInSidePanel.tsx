import React from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type SlideInSidePanelProps = {
  children: React.ReactNode;
  onClose: () => void;
  subtitle?: string;
  title?: string;
  translateX: Animated.Value;
  visible: boolean;
  width: number;
  bodyStyle?: StyleProp<ViewStyle>;
  panelStyle?: StyleProp<ViewStyle>;
  showCloseButton?: boolean;
};

export default function SlideInSidePanel({
  children,
  onClose,
  subtitle,
  title,
  translateX,
  visible,
  width,
  bodyStyle,
  panelStyle,
  showCloseButton = true,
}: SlideInSidePanelProps) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <Animated.View
        style={[
          styles.panel,
          { width, transform: [{ translateX }] },
          panelStyle,
        ]}
      >
        {title || showCloseButton ? (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {showCloseButton ? (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <ScrollView style={styles.scroll} contentContainerStyle={bodyStyle}>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 25, 35, 0.18)",
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 12,
    elevation: 5,
    zIndex: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F1923",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#8A95A3",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
});
