import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import type { RecordAction } from "../detailActions/recordActions/types";
import { BRAND_RED } from "./listTheme";

type RecordActionSheetProps = {
  actions: RecordAction[];
  onClose: () => void;
  onSelect: (action: RecordAction) => void;
  /** Mã bản ghi đang thao tác, hiện ở phụ đề cho khỏi nhầm bản ghi. */
  recordLabel?: string;
  /** Thay phụ đề mặc định, dùng khi cần nói rõ vì sao đang phải chọn. */
  subtitle?: string;
  title?: string;
  visible: boolean;
};

/**
 * Chọn việc sẽ làm với bản ghi, khi bản ghi làm được nhiều việc.
 *
 * Giữ đúng dáng của `AddChildClassSheet` (bảng chọn danh mục con ở danh sách) để
 * người dùng nhận ra đây vẫn là một kiểu bảng chọn, chỉ khác nội dung.
 */
export default function RecordActionSheet({
  actions,
  onClose,
  onSelect,
  recordLabel,
  subtitle,
  title = "Chọn thao tác",
  visible,
}: RecordActionSheetProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <BottomSheetModalShell
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress
      showHandle
      sheetStyle={styles.sheet}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle ??
          (recordLabel
            ? `Việc bạn có thể làm với ${recordLabel}`
            : "Việc bạn có thể làm với bản ghi này")}
      </Text>

      <View style={styles.list}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            disabled={action.disabled}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
              action.disabled && styles.itemDisabled,
            ]}
            onPress={() => onSelect(action)}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={action.icon || "document-text-outline"}
                size={18}
                color={BRAND_RED}
              />
            </View>

            <View style={styles.labelWrap}>
              <Text style={styles.label}>{action.label}</Text>
              {action.sublabel ? (
                <Text style={styles.sublabel} numberOfLines={1}>
                  {action.sublabel}
                </Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
        ))}
      </View>
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 12.5,
      color: c.textSub,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 12,
    },
    list: {
      gap: 8,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 11,
      paddingHorizontal: 14,
      gap: 10,
    },
    itemPressed: {
      opacity: 0.75,
    },
    itemDisabled: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    labelWrap: {
      flex: 1,
    },
    label: {
      fontSize: 13.5,
      color: c.text,
      fontWeight: "600",
    },
    sublabel: {
      fontSize: 11.5,
      color: c.textSub,
      marginTop: 1,
    },
  });
