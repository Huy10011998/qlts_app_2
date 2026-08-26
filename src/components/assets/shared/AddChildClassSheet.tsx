import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import type { MenuItemResponse } from "../../../types";
import { BRAND_RED } from "./listTheme";

type AddChildClassSheetProps = {
  /** Mã bản ghi cha đang được thêm con, hiện ở phụ đề cho khỏi nhầm dòng. */
  recordLabel?: string;
  items: MenuItemResponse[];
  onClose: () => void;
  onSelect: (item: MenuItemResponse) => void;
  visible: boolean;
};

/**
 * Chọn danh mục con để thêm bản ghi, khi bản ghi cha có nhiều class con.
 * Danh sách và cách hiển thị giống tab "Chi tiết" (`AssetDetailsTab`) để người
 * dùng nhận ra ngay đây vẫn là những danh mục đó.
 */
export default function AddChildClassSheet({
  recordLabel,
  items,
  onClose,
  onSelect,
  visible,
}: AddChildClassSheetProps) {
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
      <Text style={styles.title}>Thêm bản ghi con</Text>
      <Text style={styles.subtitle}>
        {recordLabel
          ? `Chọn danh mục con cho ${recordLabel}`
          : "Chọn danh mục con cần thêm"}
      </Text>

      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={String(item.id)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.iconWrap}>
              {item.iconImageUri ? (
                <Image
                  source={{ uri: item.iconImageUri }}
                  style={styles.iconImage}
                />
              ) : (
                <Ionicons
                  name={(item.icon as any) || "document-text-outline"}
                  size={18}
                  color={BRAND_RED}
                />
              )}
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="add-circle-outline" size={18} color={c.textMuted} />
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
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    iconImage: {
      width: 24,
      height: 24,
      resizeMode: "contain",
    },
    label: {
      flex: 1,
      fontSize: 13.5,
      color: c.text,
      fontWeight: "600",
    },
  });
