import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import EmptyState from "../../../components/ui/EmptyState";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { removeVietnameseTones } from "../../../utils/helpers/string";

export type HomeCustomizeItem = {
  description?: string;
  homeGroup?: "vehicle" | "report";
  iconName: string;
  id: string;
  label: string;
};

export type HomeCustomizeSectionKey = "feature" | "vehicle" | "report";

export type HomeCustomizeSection = {
  items: HomeCustomizeItem[];
  key: HomeCustomizeSectionKey;
  title: string;
};

const SECTION_TITLES: Record<HomeCustomizeSectionKey, string> = {
  feature: "CHỨC NĂNG",
  vehicle: "PHƯƠNG TIỆN",
  report: "BÁO CÁO",
};

// Cùng bảng màu nhấn với card trên Trang chủ (hồng · xanh · tím) để dòng trong
// bảng tuỳ chỉnh và card ghim ra ngoài nhìn là biết cùng một nhóm. Tô đỏ thương
// hiệu cho tất cả thì cả sheet chỉ còn một màu, không phân biệt được nhóm nào.
const SECTION_ACCENTS: Record<
  HomeCustomizeSectionKey,
  (c: AppColors) => { color: string; surface: string }
> = {
  feature: (c) => ({ color: c.rose, surface: c.pinkSurface }),
  vehicle: (c) => ({ color: c.sky, surface: c.blueSurface }),
  report: (c) => ({ color: c.violet, surface: c.violetSurface }),
};

const normalizeSearchText = (value: string) =>
  removeVietnameseTones(value).toLowerCase().trim();

/**
 * Ghép ba nhóm thành danh sách section, bỏ nhóm rỗng.
 *
 * Để lại một tiêu đề không có dòng nào bên dưới thì trông như lỗi tải, nên nhóm
 * nào không có mục khả dụng là biến mất hẳn.
 */
export const buildHomeCustomizeSections = (groups: {
  featureItems: HomeCustomizeItem[];
  reportItems: HomeCustomizeItem[];
  vehicleItems: HomeCustomizeItem[];
}): HomeCustomizeSection[] =>
  [
    { key: "feature" as const, items: groups.featureItems },
    { key: "vehicle" as const, items: groups.vehicleItems },
    { key: "report" as const, items: groups.reportItems },
  ]
    .filter((section) => section.items.length > 0)
    .map(({ key, items }) => ({ key, title: SECTION_TITLES[key], items }));

/**
 * Lọc section theo từ khoá, bỏ dấu hai đầu — user gõ "phuong tien" phải ra
 * "Phương tiện". Section không còn mục nào thì rụng luôn tiêu đề.
 */
export const filterHomeCustomizeSections = (
  sections: HomeCustomizeSection[],
  searchQuery: string,
): HomeCustomizeSection[] => {
  const keyword = normalizeSearchText(searchQuery);

  if (!keyword) return sections;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        normalizeSearchText(item.label).includes(keyword),
      ),
    }))
    .filter((section) => section.items.length > 0);
};

type HomeCustomizeSheetProps = {
  onClose: () => void;
  onTogglePinned: (featureId: string) => void;
  pinnedIds: string[];
  sections: HomeCustomizeSection[];
  visible: boolean;
};

/**
 * Bảng "Tuỳ chỉnh" của Trang chủ: bật/tắt từng mục cho hàng TRUY CẬP NHANH.
 *
 * Nút + trên card ở tab Chức năng vẫn giữ, nhưng ở đó user phải đi tìm; đây là
 * chỗ thấy hết chức năng, phương tiện, báo cáo trong một danh sách và ghim ngay
 * mà không rời Trang chủ. Mọi thay đổi ăn ngay (không có nút Lưu) — cùng một
 * `togglePinnedFeature` nên hàng shortcut đằng sau sheet cập nhật tức thì.
 */
export default function HomeCustomizeSheet({
  onClose,
  onTogglePinned,
  pinnedIds,
  sections,
  visible,
}: HomeCustomizeSheetProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const [searchQuery, setSearchQuery] = useState("");
  const visibleSections = useMemo(
    () => filterHomeCustomizeSections(sections, searchQuery),
    [searchQuery, sections],
  );
  const pinnedCount = useMemo(() => {
    const availableIds = new Set(
      sections.flatMap((section) => section.items.map((item) => item.id)),
    );

    // Danh sách ghim còn giữ id của chức năng user đã bị thu quyền — đếm theo id
    // còn khả dụng để con số khớp số card đang hiện trên Trang chủ.
    return pinnedIds.filter((id) => availableIds.has(id)).length;
  }, [pinnedIds, sections]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
    }
  }, [visible]);

  return (
    <BottomSheetModalShell
      visible={visible}
      animationType="fade"
      closeOnBackdropPress
      onClose={onClose}
      overlayStyle={styles.overlay}
      sheetStyle={[styles.sheet, { backgroundColor: colors.bg }]}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
      avoidKeyboard
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.text }]}
          allowFontScaling={false}
        >
          Chọn chức năng
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSub }]}
          allowFontScaling={false}
        >
          {pinnedCount > 0
            ? `${pinnedCount} mục đang hiện ở Truy cập nhanh`
            : "Chọn mục bạn dùng nhiều để hiện ở Truy cập nhanh"}
        </Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="search" size={16} color={colors.textSub} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Tìm chức năng, báo cáo..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          allowFontScaling={false}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textSub} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.listView}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {visibleSections.length === 0 ? (
          <EmptyState
            iconName={
              sections.length === 0 ? "lock-closed-outline" : "search-outline"
            }
            title={
              sections.length === 0
                ? "Chưa có chức năng khả dụng"
                : "Không tìm thấy mục nào"
            }
            subtitle={
              sections.length === 0
                ? "Tài khoản hiện tại chưa được cấp quyền xem chức năng nào."
                : "Thử tìm với từ khoá khác."
            }
            fullHeight={false}
          />
        ) : (
          visibleSections.map((section) => {
            const accent = SECTION_ACCENTS[section.key](colors);

            return (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionDot,
                      { backgroundColor: accent.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.textSecondary },
                    ]}
                    allowFontScaling={false}
                  >
                    {section.title}
                  </Text>
                  <Text
                    style={[styles.sectionCount, { color: colors.textSub }]}
                    allowFontScaling={false}
                  >
                    {section.items.length}
                  </Text>
                </View>

                {/* Cả nhóm là MỘT thẻ, các dòng chỉ cách nhau bằng vạch mảnh —
                    trước đây mỗi dòng là một hộp có viền riêng nên màn hình đầy
                    khung chồng khung. */}
                <View
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: hairlineBorderColor,
                      shadowColor: colors.shadow,
                    },
                  ]}
                >
                  {section.items.map((item, index) => {
                    const isPinned = pinnedIds.includes(item.id);
                    // Payload hay trả `longLabel` trùng y nhãn ("Nội địa · Nội
                    // địa") — lặp lại hai lần chỉ làm dòng cao thêm vô ích.
                    const description =
                      item.description &&
                      normalizeSearchText(item.description) !==
                        normalizeSearchText(item.label)
                        ? item.description
                        : undefined;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.row,
                          index > 0 && {
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: hairlineBorderColor,
                          },
                        ]}
                        activeOpacity={0.6}
                        onPress={() => onTogglePinned(item.id)}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: isPinned }}
                        accessibilityLabel={item.label}
                      >
                        <View
                          style={[
                            styles.rowIcon,
                            {
                              backgroundColor: isPinned
                                ? accent.surface
                                : colors.surfaceAlt,
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.iconName}
                            size={17}
                            color={isPinned ? accent.color : colors.textSub}
                          />
                        </View>

                        <View style={styles.rowTextWrap}>
                          <Text
                            style={[styles.rowLabel, { color: colors.text }]}
                            allowFontScaling={false}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>
                          {description ? (
                            <Text
                              style={[
                                styles.rowDescription,
                                { color: colors.textSub },
                              ]}
                              allowFontScaling={false}
                              numberOfLines={1}
                            >
                              {description}
                            </Text>
                          ) : null}
                        </View>

                        <View
                          style={[
                            styles.rowToggle,
                            isPinned
                              ? {
                                  backgroundColor: accent.color,
                                  borderColor: accent.color,
                                }
                              : { borderColor: colors.borderStrong },
                          ]}
                        >
                          {isPinned ? (
                            <Ionicons name="checkmark" size={15} color="#fff" />
                          ) : (
                            <Ionicons
                              name="add"
                              size={15}
                              color={colors.textSub}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(9, 17, 27, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      height: "82%",
    },
    closeButton: {
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    header: {
      marginTop: 2,
      marginBottom: 14,
      paddingHorizontal: 44,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: "500",
      textAlign: "center",
      marginTop: 3,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      height: 42,
      fontSize: 14,
      paddingVertical: 0,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    listView: { flex: 1 },
    listContent: { paddingBottom: 20 },
    section: { marginBottom: 18 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    sectionDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
    },
    sectionCount: {
      fontSize: 11,
      fontWeight: "700",
    },
    sectionCard: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTextWrap: { flex: 1 },
    rowLabel: {
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: -0.1,
    },
    rowDescription: {
      fontSize: 11.5,
      fontWeight: "500",
      marginTop: 2,
    },
    rowToggle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
  });
