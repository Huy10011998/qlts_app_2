import React from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Field } from "../../../types/index";
import { TypeProperty } from "../../../utils/Enum";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { SECTION_TABS_HEIGHT } from "../../tabs/DetailSectionTabs";
import { useSkeletonAutoFill } from "../../ui/useSkeletonAutoFill";

/** Một hàng field: `paddingVertical 9` + nhãn + giá trị — xem `AssetGroupList`. */
const FIELD_ROW_HEIGHT = 56;

/**
 * Khung chờ của màn chi tiết bản ghi.
 *
 * Khác mọi khung chờ còn lại: ở đây app **đã biết trước bố cục**, nên không phải
 * đoán. `field` được màn danh sách stringify sẵn vào route param rồi
 * `useDetailViewState` parse đồng bộ, nên ngay frame đầu đã có đủ số nhóm, tên
 * nhóm, số field và nhãn từng field — chỉ GIÁ TRỊ là phải chờ `getDetails`.
 *
 * Vì vậy nó vẽ **nhãn thật** và chỉ tô vạch xám chỗ giá trị: người dùng đọc được
 * ngay bản ghi sắp hiện ra những thông tin gì, và lúc dữ liệu về không có gì
 * dịch chuyển vì mọi kích thước đã đúng. Trước đây chỗ này là vòng xoay giữa màn
 * trắng, tức là tự bỏ đi bố cục mà nó đang cầm trong tay.
 */
export default function AssetDetailsSkeleton({
  groupedFields,
  tabCount,
}: {
  groupedFields: Record<string, Field[]>;
  /** Số tab thật của màn, để thanh tab không đổi bề rộng ô khi dữ liệu về. */
  tabCount: number;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const { opacity } = useSkeletonAutoFill(FIELD_ROW_HEIGHT, 1);
  const groups = Object.entries(groupedFields);

  return (
    <View style={styles.container} accessibilityLabel="Đang tải chi tiết">
      <View style={styles.tabsShell}>
        {Array.from({ length: tabCount }).map((_, index) => (
          <Animated.View
            key={`tab-${index}`}
            style={[styles.tab, { backgroundColor: colors.skeleton, opacity }]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {groups.map(([groupName, fields]) => (
          <View key={groupName} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupBullet} />
              <Text style={styles.groupTitle} numberOfLines={1}>
                {groupName}
              </Text>
              <Text style={styles.groupCount}>{fields.length}</Text>
            </View>

            {fields.map((field, index) => (
              <View
                key={field.name ?? `${groupName}-${index}`}
                style={[
                  styles.fieldRow,
                  index < fields.length - 1 && styles.fieldDivider,
                ]}
              >
                <Text style={styles.label} numberOfLines={1}>
                  {field.moTa}
                </Text>
                {field.typeProperty === TypeProperty.Image ? (
                  <Animated.View
                    style={[
                      styles.imageValue,
                      { backgroundColor: colors.skeleton, opacity },
                    ]}
                  />
                ) : (
                  <Animated.View
                    style={[
                      styles.value,
                      // Dài ngắn khác nhau cho giống giá trị thật, không thành
                      // một cột vạch đều tăm tắp.
                      index % 3 === 0 && styles.valueShort,
                      index % 4 === 1 && styles.valueLong,
                      { backgroundColor: colors.skeleton, opacity },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    tabsShell: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    tab: {
      flex: 1,
      height: SECTION_TABS_HEIGHT - 16,
      borderRadius: (SECTION_TABS_HEIGHT - 16) / 2,
    },
    content: {
      padding: 16,
      paddingBottom: 20,
    },
    groupCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
      paddingBottom: 12,
      marginBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    groupBullet: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: c.red,
    },
    groupTitle: { flex: 1, fontSize: 15.5, fontWeight: "700", color: c.red },
    groupCount: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      minWidth: 18,
      textAlign: "right",
    },
    fieldRow: {
      paddingVertical: 9,
    },
    fieldDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    label: {
      fontWeight: "600",
      color: c.textMuted,
      fontSize: 11.5,
      letterSpacing: 0.2,
      marginBottom: 3,
    },
    value: {
      width: "58%",
      height: 14,
      marginVertical: 3,
      borderRadius: 6,
    },
    valueShort: {
      width: "34%",
    },
    valueLong: {
      width: "76%",
    },
    imageValue: {
      width: "100%",
      aspectRatio: 4 / 3,
      marginTop: 4,
      borderRadius: 10,
    },
  });
