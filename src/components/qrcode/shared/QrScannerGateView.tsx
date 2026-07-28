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
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";

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
  iconColor,
  iconName,
  onAction,
  onBack,
  rootStyle,
  title,
}: QrScannerGateViewProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const resolvedIconColor = iconColor ?? c.textMuted;
  return (
    <SafeAreaView style={[styles.root, rootStyle]}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.content, { marginTop: contentOffsetY }]}>
        <Ionicons name={iconName} size={56} color={resolvedIconColor} />
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.surface,
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
      color: c.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      color: c.textSecondary,
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
