import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import type { ScanMode } from "../../../context/ScanModeContext";
import { BRAND_RED } from "../../assets/shared/listTheme";

type ScanModeSheetProps = {
  mode: ScanMode;
  onClose: () => void;
  onSelect: (mode: ScanMode) => void;
  visible: boolean;
};

type ScanModeOption = {
  icon: string;
  key: string;
  label: string;
  mode: ScanMode;
  sublabel: string;
};

/**
 * Bảng của pill: đổi hoặc bỏ việc đang nhớ.
 *
 * KHÁC bảng hiện ra sau khi quét — bảng kia liệt kê việc của đúng tài sản vừa
 * quét. Ở đây chưa quét gì nên không biết tài sản nào, chỉ có ba lựa chọn không
 * phụ thuộc tài sản: giữ việc đang nhớ, chỉ xem thông tin, hoặc hỏi lại ở lần
 * quét tới (rồi chọn trên chính tài sản đó).
 */
export default function ScanModeSheet({
  mode,
  onClose,
  onSelect,
  visible,
}: ScanModeSheetProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  const options = useMemo<ScanModeOption[]>(() => {
    const list: ScanModeOption[] = [];

    if (mode.state === "action") {
      list.push({
        key: "current",
        mode,
        label: mode.label,
        sublabel: "Quét là vào thẳng việc này",
        icon: mode.icon || "ellipsis-horizontal-circle-outline",
      });
    }

    list.push(
      {
        key: "ask",
        mode: { state: "ask" },
        label: "Chọn khi quét",
        sublabel: "Quét xong hiện danh sách việc của thiết bị đó",
        icon: "help-circle-outline",
      },
      {
        key: "view",
        mode: { state: "view" },
        label: "Xem thông tin",
        sublabel: "Quét xong mở màn thông tin thiết bị",
        icon: "information-circle-outline",
      },
    );

    return list;
  }, [mode]);

  return (
    <BottomSheetModalShell
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress
      showHandle
      sheetStyle={styles.sheet}
    >
      <Text style={styles.title}>Chế độ quét</Text>
      <Text style={styles.subtitle}>
        Việc sẽ làm với mọi mã quét được, tới khi bạn đổi
      </Text>

      <View style={styles.list}>
        {options.map((option) => {
          const isSelected = option.mode.state === mode.state;

          return (
            <Pressable
              key={option.key}
              style={({ pressed }) => [
                styles.item,
                isSelected && styles.itemSelected,
                pressed && styles.itemPressed,
              ]}
              onPress={() => onSelect(option.mode)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={option.icon} size={18} color={BRAND_RED} />
              </View>

              <View style={styles.labelWrap}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.sublabel} numberOfLines={1}>
                  {option.sublabel}
                </Text>
              </View>

              {isSelected ? (
                <Ionicons name="checkmark-circle" size={20} color={BRAND_RED} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={c.textMuted} />
              )}
            </Pressable>
          );
        })}
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "transparent",
      paddingVertical: 11,
      paddingHorizontal: 14,
      gap: 10,
    },
    itemSelected: {
      borderColor: c.redBorder,
      backgroundColor: c.redSurface,
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
