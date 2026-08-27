import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  LayoutAnimation,
  Platform,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  UIManager,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { PropsEnum } from "../../types/components.d";
import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../ui/IconLoading";
import SearchBar from "../ui/SearchBar";
import EmptyState from "../ui/EmptyState";
import BottomSheetModalShell from "../shared/BottomSheetModalShell";
import {
  AppColors,
  useSeparatorColor,
  useStyles,
} from "../../utils/helpers/colors";
import { COMPACT_TEXT_MAX_SCALE } from "../../utils/helpers/textScaling";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ExtraProps = {
  errorMessage?: string | null;
  isSearching?: boolean;
  loadingMore?: boolean;
  total?: number;
  loadedCount?: number;
  /**
   * Bật đường tắt "thêm nhanh": hiện nút thêm cạnh ô tìm kiếm. Chỉ nơi gọi biết
   * class đích và quyền `Insert` nên việc quyết định có nút hay không nằm ở đó.
   */
  onQuickAdd?: () => void;
  quickAddLabel?: string;
  /**
   * Form thêm nhanh. Có nội dung thì sheet đổi hẳn sang form — cố ý KHÔNG mở
   * thêm một Modal nữa: chồng ba lớp Modal (picker → form → picker của form)
   * là chỗ iOS hay không hiện lớp trong cùng.
   */
  quickAddContent?: React.ReactNode | null;
  onQuickAddClose?: () => void;
};

export default function EnumAndReferencePickerModal({
  visible,
  title,
  items,
  selectedValue,
  isMulti,
  onClose,
  onSelect,
  onLoadMore,
  onSearch,
  errorMessage,
  isSearching,
  loadingMore,
  total = 0,
  loadedCount,
  onQuickAdd,
  quickAddLabel = "Thêm mới",
  quickAddContent,
  onQuickAddClose,
}: PropsEnum & ExtraProps) {
  const styles = useStyles(makeStyles);
  const separatorColor = useSeparatorColor();
  const isQuickAdding = Boolean(quickAddContent);
  const [searchText, setSearchText] = useState("");
  const [multiSelectedValues, setMultiSelectedValues] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchText, 600);
  const lastSearchRef = useRef("");
  const loaded =
    loadedCount ?? items?.filter((i) => i.value !== "").length ?? 0;
  const orderedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (
      selectedValue === null ||
      selectedValue === undefined ||
      String(selectedValue).trim() === ""
    ) {
      return items;
    }

    const selectedValues = String(selectedValue ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const selectedItems = items.filter((item) =>
      isMulti
        ? selectedValues.includes(String(item.value))
        : String(item.value) === String(selectedValue),
    );

    if (!selectedItems.length) return items;

    const remainingItems = items.filter((item) =>
      isMulti
        ? !selectedValues.includes(String(item.value))
        : String(item.value) !== String(selectedValue),
    );

    return [...selectedItems, ...remainingItems];
  }, [isMulti, items, selectedValue]);
  const hasRealItems = orderedItems.some((item) => item.value !== "");
  const isSearchEmpty =
    searchText.trim().length > 0 && total === 0 && !isSearching;
  const isEmpty = Boolean(errorMessage) || isSearchEmpty || !hasRealItems;
  const listItems = isEmpty ? [] : orderedItems;
  const listAnimationKey = `${listItems.length}-${total}-${Boolean(
    errorMessage,
  )}`;
  const hasSearchText = searchText.trim().length > 0;
  const showSearchSpinner = Boolean(isSearching && hasSearchText);

  const handleClearSearch = () => {
    setSearchText("");

    if (lastSearchRef.current !== "") {
      lastSearchRef.current = "";
      onSearch?.("");
    }
  };

  useEffect(() => {
    if (!visible) return;

    const nextSearch = debouncedSearch.trim();
    if (nextSearch === lastSearchRef.current) return;

    lastSearchRef.current = nextSearch;
    onSearch?.(nextSearch);
  }, [debouncedSearch, visible, onSearch]);

  useEffect(() => {
    if (!visible) {
      setSearchText("");
      lastSearchRef.current = "";
      setMultiSelectedValues([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !isMulti) return;

    setMultiSelectedValues(
      String(selectedValue ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }, [isMulti, selectedValue, visible]);

  useEffect(() => {
    if (!visible) return;

    if (Platform.OS !== "android") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [listAnimationKey, visible]);

  const renderItem = ({ item }: any) => {
    const isEmptyValue = item.value === "";
    const hasSelectedValue =
      selectedValue !== null &&
      selectedValue !== undefined &&
      String(selectedValue).trim() !== "";
    const isSelected = isMulti
      ? !isEmptyValue && multiSelectedValues.includes(String(item.value))
      : !isEmptyValue &&
        hasSelectedValue &&
        String(item.value) === String(selectedValue);

    return (
      <TouchableOpacity
        style={[
          styles.modalItem,
          { borderColor: separatorColor },
          isSelected && styles.modalItemSelected,
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (isMulti) {
            if (isEmptyValue) {
              setMultiSelectedValues([]);
              return;
            }

            const itemValue = String(item.value);
            setMultiSelectedValues((prev) =>
              prev.includes(itemValue)
                ? prev.filter((value) => value !== itemValue)
                : [...prev, itemValue],
            );
            return;
          }

          onSelect(item.value);
          onClose();
        }}
      >
        <Text
          style={[
            styles.modalItemText,
            isEmptyValue && styles.emptyItemText,
            isSelected && styles.modalItemTextSelected,
          ]}
        >
          {item.text}
        </Text>
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
        ) : null}
      </TouchableOpacity>
    );
  };

  if (isQuickAdding) {
    return (
      <BottomSheetModalShell
        visible={visible}
        avoidKeyboard
        closeOnBackdropPress
        /* Nút back của máy chỉ lùi về danh sách, còn bấm ra ngoài sheet là thoát
           hẳn — đúng như bấm ra ngoài lúc đang xem danh sách. */
        onClose={() => onQuickAddClose?.()}
        onBackdropPress={onClose}
        statusBarTranslucent
        presentationStyle="overFullScreen"
        sheetStyle={[styles.modalContainer, { paddingBottom: 16 }]}
        showHandle
      >
        {quickAddContent}
      </BottomSheetModalShell>
    );
  }

  return (
    <BottomSheetModalShell
      visible={visible}
      closeOnBackdropPress
      onClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      sheetStyle={[styles.modalContainer, { paddingBottom: 16 }]}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
    >
      <Text style={styles.modalTitle}>
        {title}
      </Text>

      {isMulti ? (
        <View style={styles.multiActionRow}>
          <Text style={styles.multiCount}>
            Đã chọn: {multiSelectedValues.length}
          </Text>
          <TouchableOpacity
            style={styles.multiDoneButton}
            onPress={() => {
              onSelect(multiSelectedValues.join(","));
              onClose();
            }}
          >
            <Text style={styles.multiDoneText}>
              Xong
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <View style={styles.searchGrow}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm kiếm..."
            onClear={handleClearSearch}
            isSearching={showSearchSpinner}
            maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
          />
        </View>

        {onQuickAdd ? (
          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={onQuickAdd}
            accessibilityRole="button"
            accessibilityLabel={`${quickAddLabel} ${title}`}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {!isEmpty ? (
        <View style={styles.stickyHeader}>
          <Text style={styles.header}>
            Tổng: {total} (Đã tải: {loaded})
          </Text>
        </View>
      ) : null}

      <FlatList
        data={listItems}
        keyExtractor={(item, index) => String(item.value ?? index)}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <IsLoading size="small" />
            </View>
          ) : null
        }
        ListHeaderComponent={null}
        ListEmptyComponent={
          <EmptyState
            iconName={errorMessage ? "cloud-offline-outline" : "search-outline"}
            title={
              errorMessage ? "Không thể tải dữ liệu" : "Không tìm thấy dữ liệu"
            }
            subtitle={errorMessage || "Thử tìm kiếm với từ khóa khác"}
          />
        }
        stickyHeaderIndices={[]}
      />
    </BottomSheetModalShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    modalContainer: {
      height: "75%",
      backgroundColor: c.surface,
      paddingHorizontal: 16,
      paddingTop: 8,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      marginBottom: 16,
      textAlign: "center",
      paddingHorizontal: 52,
    },

    closeButton: {
      top: 10,
    },

    multiActionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    multiCount: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
    },

    multiDoneButton: {
      minHeight: 36,
      borderRadius: 8,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.red,
    },

    multiDoneText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fff",
    },

    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },

    searchGrow: {
      flex: 1,
      minWidth: 0,
    },

    /* Nút thêm nhanh nằm cạnh ô tìm kiếm: người dùng tìm không thấy thì việc kế
       tiếp là tạo mới, để ngay đó thì không phải thoát ra khỏi form. Chỉ dấu
       cộng — ô tìm kiếm mới là thứ cần chỗ ở hàng này. */
    quickAddButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: c.red,
    },


    list: {
      flex: 1,
      minHeight: 0,
    },
    footerLoading: {
      paddingVertical: 16,
    },

    listContent: {
      flexGrow: 1,
    },
    listContentEmpty: {
      paddingTop: 0,
      paddingBottom: 0,
    },

    modalItem: {
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    modalItemText: {
      fontSize: 15,
      color: c.text,
      flex: 1,
      paddingRight: 12,
    },

    modalItemSelected: {
      backgroundColor: c.greenLight,
    },

    modalItemTextSelected: {
      fontWeight: "700",
      color: c.green,
    },

    header: {
      textAlign: "center",
      fontSize: 14,
      color: c.text,
      fontWeight: "600",
    },

    stickyHeader: {
      backgroundColor: c.surfaceAlt,
      paddingVertical: 10,
      zIndex: 10,
    },

    emptyItemText: {
      color: c.textMuted, // xám nhạt
      fontStyle: "italic", // nhìn là biết option đặc biệt
    },
  });
