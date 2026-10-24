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
  /** Hiện / ẩn một khối trên Trang chủ (nút tròn ở mép phải mỗi hàng). */
  onToggleHidden?: (key: string, hidden: boolean) => void;
  visible: boolean;
};

export default function HomeBlockOrderSheet({
  items,
  onClose,
  onMove,
  onToggleHidden,
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
            ? "Kéo tên khối lên hoặc xuống để đổi thứ tự. Bấm nút tròn bên phải để ẩn / hiện khối (có dấu tích là đang hiện). Lưu riêng theo tài khoản của bạn."
            : "Bấm nút tròn bên phải để ẩn / hiện khối (có dấu tích là đang hiện). Lưu riêng theo tài khoản của bạn."}
        </Text>
      </View>

      <View style={styles.body}>
        {/* Một khối cũng dựng danh sách: chưa có gì để kéo nhưng vẫn cần nút
            ẩn / hiện khối đó. */}
        {items.length > 0 ? (
          <HomeReorderList
            items={items}
            onMove={onMove}
            onToggleHidden={onToggleHidden}
          />
        ) : (
          <EmptyState
            iconName="layers-outline"
            title="Chưa có khối nào"
            subtitle="Tài khoản chưa có khối nào để hiện trên Trang chủ. Cần xem số liệu thì nhờ IT cấp quyền."
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
