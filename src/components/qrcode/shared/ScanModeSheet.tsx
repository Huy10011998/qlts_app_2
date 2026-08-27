import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import BottomSheetModalShell from "../../shared/BottomSheetModalShell";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import type { RecordActionKindInfo } from "../../../constants/recordActionKinds";
import type { ScanMode } from "../../../context/ScanModeContext";
import { BRAND_RED } from "../../assets/shared/listTheme";

type ScanModeSheetProps = {
  /** Loại việc người dùng có quyền chọn — xem `useAvailableScanModes`. */
  kinds: RecordActionKindInfo[];
  mode: ScanMode;
  onClose: () => void;
  onSelect: (mode: ScanMode) => void;
  visible: boolean;
};

type ScanModeOption = {
  icon: string;
  label: string;
  mode: ScanMode;
  sublabel: string;
};

const VIEW_OPTION: ScanModeOption = {
  mode: "view",
  label: "Xem thông tin",
  sublabel: "Quét xong mở màn thông tin thiết bị",
  icon: "information-circle-outline",
};

/**
 * Danh sách là loại việc (`RECORD_ACTION_KINDS`, đã lọc quyền) chứ KHÔNG phải việc
 * làm được của một bản ghi cụ thể: chưa quét thì chưa biết bản ghi thuộc class
 * nào, mà chế độ phải chọn được trước khi quét.
 *
 * Chọn một việc mà thiết bị quét được không làm được thì màn quét tự mở thông tin
 * thiết bị kèm lời giải thích — không chặn đường ai.
 */
export default function ScanModeSheet({
  kinds,
  mode,
  onClose,
  onSelect,
  visible,
}: ScanModeSheetProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  const options = useMemo<ScanModeOption[]>(
    () => [
      VIEW_OPTION,
      ...kinds.map((info) => ({
        mode: info.kind as ScanMode,
        label: info.label,
        sublabel: `Quét xong vào thẳng ${info.label.toLowerCase()}`,
        icon: info.icon,
      })),
    ],
    [kinds],
  );

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
          const isSelected = option.mode === mode;

          return (
            <Pressable
              key={option.mode}
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
                <Ionicons
                  name="ellipse-outline"
                  size={20}
                  color={c.textMuted}
                />
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
