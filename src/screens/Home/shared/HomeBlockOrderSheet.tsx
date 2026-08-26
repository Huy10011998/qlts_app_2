import React from "react";
import { StyleSheet, Text, View } from "react-native";

import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import EmptyState from "../../../components/ui/EmptyState";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import HomeReorderList, { type HomeReorderItem } from "./HomeReorderList";

type HomeBlockOrderSheetProps = {
  items: HomeReorderItem[];
  onClose: () => void;
  onMove: (args: {
    fromIndex: number;
    toIndex: number;
    keys: string[];
  }) => void;
  visible: boolean;
};

export default function HomeBlockOrderSheet({
  items,
  onClose,
  onMove,
  visible,
}: HomeBlockOrderSheetProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();

  return (
    <BottomSheetModalShell
      visible={visible}
      closeOnBackdropPress
      onClose={onClose}
      overlayStyle={styles.overlay}
      sheetStyle={[styles.sheet, { backgroundColor: colors.bg }]}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.text }]}
        >
          Sắp xếp Trang chủ
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSub }]}
        >
          {items.length > 1
            ? "Kéo tên khối lên hoặc xuống để đổi thứ tự. Thứ tự lưu riêng theo tài khoản của bạn."
            : "Thứ tự lưu riêng theo tài khoản của bạn."}
        </Text>
      </View>

      <View style={styles.body}>
        {items.length > 1 ? (
          <HomeReorderList items={items} onMove={onMove} />
        ) : (
          <EmptyState
            iconName="layers-outline"
            title="Chưa cần sắp xếp"
            subtitle="Trang chủ đang chỉ hiện một khối. Khi có thêm khối, bạn có thể kéo để đổi thứ tự tại đây."
            fullHeight={false}
          />
        )}
      </View>
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    overlay: {
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    closeButton: {
      top: 14,
      right: 14,
    },
    header: {
      paddingRight: 40,
      marginBottom: 14,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 12.5,
      fontWeight: "500",
      color: c.textSub,
    },
    body: {
      paddingBottom: 12,
    },
  });
