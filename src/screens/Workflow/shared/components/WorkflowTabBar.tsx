import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppColors, useStyles } from "../../../../utils/helpers/colors";

export type WorkflowTabItem = {
  key: string;
  label: string;
  /** undefined = tab không có số. */
  count?: number;
};

type Props = {
  tabs: WorkflowTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  /**
   * Nằm trong nội dung đã có lề (màn chi tiết): bỏ lề + nền riêng, viên nhỏ
   * hơn — không thì thụt vào so với các khối phía trên. Màn chi tiết chỉ vài
   * tab nên các tab chia đều cả bề ngang (2 tab mỗi tab một nửa, 3 tab chia ba),
   * không cuộn.
   */
  embedded?: boolean;
};

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * Thanh tab dạng viên thuốc. Danh sách (6–7 tab phiếu / công việc): cuộn ngang,
 * chia đều thì bị bóp chữ. Màn chi tiết (`embedded`): chia đều một hàng.
 */
export default function WorkflowTabBar({ tabs, activeKey, onChange, embedded }: Props) {
  const styles = useStyles(makeStyles);

  const items = tabs.map((tab) => {
    const active = tab.key === activeKey;
    return (
      <TouchableOpacity
        key={tab.key}
        activeOpacity={0.8}
        onPress={() => onChange(tab.key)}
        style={[styles.tab, embedded && styles.tabEmbedded, active && styles.tabActive]}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <Text
          style={[styles.label, embedded && styles.labelEmbedded, active && styles.labelActive]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
        {tab.count ? (
          <View style={[styles.count, active && styles.countActive]}>
            <Text style={[styles.countText, active && styles.countTextActive]}>
              {formatCount(tab.count)}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  });

  if (embedded) {
    return (
      <View style={[styles.wrapEmbedded, styles.contentEmbedded, styles.row]}>{items}</View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {items}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.bg,
    },
    wrapEmbedded: {
      marginBottom: 4,
    },
    // Cao đúng bằng nội dung — xem chú thích ở MaMauFilter.
    scroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    content: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    contentEmbedded: {
      paddingHorizontal: 0,
      paddingVertical: 6,
      gap: 8,
    },
    row: {
      flexDirection: "row",
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      // Cao bằng tab có viên số (18): số đếm về sau (dem-tab) thì hàng tab khỏi
      // nhích cao thêm ~2.5pt, đẩy cả danh sách xuống.
      minHeight: 18 + 8 * 2 + StyleSheet.hairlineWidth * 2,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
    },
    // Chia đều hàng: mỗi tab giãn bằng nhau, chữ + số nằm giữa viên.
    tabEmbedded: {
      flex: 1,
      justifyContent: "center",
      minHeight: 18 + 8 * 2 + StyleSheet.hairlineWidth * 2,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    tabActive: {
      backgroundColor: c.red,
      borderColor: c.red,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    labelEmbedded: {
      flexShrink: 1,
      fontSize: 13,
    },
    labelActive: {
      color: c.onBrand,
    },
    count: {
      marginLeft: 6,
      minWidth: 20,
      paddingHorizontal: 5,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    countActive: {
      backgroundColor: c.onBrand,
    },
    countText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.red,
    },
    countTextActive: {
      color: c.red,
    },
  });
