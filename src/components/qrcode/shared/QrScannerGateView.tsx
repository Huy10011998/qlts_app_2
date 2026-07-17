import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";

type QrScannerGateViewProps = {
  actionLabel?: string;
  contentOffsetY?: number;
  description?: string;
  iconColor?: string;
  iconName: string;
  onAction?: () => void;
  onBack?: () => void;
  rootStyle?: ViewStyle;
  title: string;
};

export default function QrScannerGateView({
  actionLabel,
  contentOffsetY = 0,
  description,
  iconColor = C.textMuted,
  iconName,
  onAction,
  onBack,
  rootStyle,
  title,
}: QrScannerGateViewProps) {
  return (
    <SafeAreaView style={[styles.root, rootStyle]}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.content, { marginTop: contentOffsetY }]}>
        <Ionicons name={iconName} size={56} color={iconColor} />
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  backBtn: {
    padding: 16,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  actionBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
