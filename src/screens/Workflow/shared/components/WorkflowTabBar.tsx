import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { COMPACT_TEXT_MAX_SCALE } from "../../../../utils/helpers/textScaling";

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
   * hơn — không thì thụt vào so với các khối phía trên.
   */
  embedded?: boolean;
};

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * Thanh tab dạng viên thuốc, cuộn ngang. `DetailSectionTabs` chia đều bề ngang
 * nên 6–7 tab của danh sách phiếu / công việc sẽ bị bóp chữ — dùng thanh này.
 */
export default function WorkflowTabBar({ tabs, activeKey, onChange, embedded }: Props) {
  const styles = useStyles(makeStyles);

  return (
    <View style={embedded ? styles.wrapEmbedded : styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.content, embedded && styles.contentEmbedded]}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => onChange(tab.key)}
              style={[styles.tab, embedded && styles.tabEmbedded, active && styles.tabActive]}
            >
              <Text
                style={[styles.label, embedded && styles.labelEmbedded, active && styles.labelActive]}
                maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
              >
                {tab.label}
              </Text>
              {tab.count ? (
                <View style={[styles.count, active && styles.countActive]}>
                  <Text
                    style={[styles.countText, active && styles.countTextActive]}
                    maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
                  >
                    {formatCount(tab.count)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
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
      gap: 6,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
    },
    tabEmbedded: {
      paddingHorizontal: 12,
      paddingVertical: 6,
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
      fontSize: 12,
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
