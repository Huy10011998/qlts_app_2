import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  LayoutAnimation,
  Platform,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { PropsEnum } from "../../types/components.d";
import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../ui/IconLoading";
import EmptyState from "../ui/EmptyState";
import BottomSheetModalShell from "../shared/BottomSheetModalShell";
import { C } from "../../utils/helpers/colors";
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
}: PropsEnum & ExtraProps) {
  const insets = useSafeAreaInsets();
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
  const listAnimationKey = `${listItems.length}-${total}-${Boolean(errorMessage)}`;
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
    const isSelected =
      isMulti
        ? !isEmptyValue && multiSelectedValues.includes(String(item.value))
        : !isEmptyValue &&
          hasSelectedValue &&
          String(item.value) === String(selectedValue);

    return (
      <TouchableOpacity
        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
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

  return (
    <BottomSheetModalShell
      visible={visible}
      animationType="slide"
      closeOnBackdropPress
      onClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      sheetStyle={[
        styles.modalContainer,
        { paddingBottom: insets.bottom || 16 },
      ]}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
    >
      <Text style={styles.modalTitle} allowFontScaling={false}>
        {title}
      </Text>

      {isMulti ? (
        <View style={styles.multiActionRow}>
          <Text style={styles.multiCount} allowFontScaling={false}>
            Đã chọn: {multiSelectedValues.length}
          </Text>
          <TouchableOpacity
            style={styles.multiDoneButton}
            onPress={() => {
              onSelect(multiSelectedValues.join(","));
              onClose();
            }}
          >
            <Text style={styles.multiDoneText} allowFontScaling={false}>
              Xong
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.searchWrapper}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color="#8A95A3" />
        </View>
        <TextInput
          placeholder="Tìm kiếm..."
          placeholderTextColor="#B0B8C4"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          clearButtonMode="never"
          returnKeyType="search"
          maxFontSizeMultiplier={COMPACT_TEXT_MAX_SCALE}
        />

        {showSearchSpinner && (
          <View style={styles.spinnerWrap}>
            <IsLoading size="small" color={C.red} />
          </View>
        )}
        {!showSearchSpinner && searchText.length > 0 ? (
          <Pressable
            onPress={handleClearSearch}
            style={styles.clearButton}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={16} color="#B0B8C4" />
          </Pressable>
        ) : null}
      </View>

      {!isEmpty ? (
        <View style={styles.stickyHeader}>
          <Text style={styles.header} allowFontScaling={false}>
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
        removeClippedSubviews={Platform.OS === "ios"}
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
            title={errorMessage ? "Không thể tải dữ liệu" : "Không tìm thấy dữ liệu"}
            subtitle={errorMessage || "Thử tìm kiếm với từ khóa khác"}
          />
        }
        stickyHeaderIndices={[]}
      />
    </BottomSheetModalShell>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    height: "75%",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    color: "#667085",
  },

  multiDoneButton: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.red,
  },

  multiDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    marginBottom: 8,
    shadowColor: "#1A2340",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  searchIconWrap: {
    marginRight: 8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 20,
    color: "#0F1923",
    fontWeight: "400",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  spinnerWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  clearButton: {
    padding: 4,
    marginLeft: 4,
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
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalItemText: {
    fontSize: 15,
    color: "#000",
    flex: 1,
    paddingRight: 12,
  },

  modalItemSelected: {
    backgroundColor: "#F0FDF4",
  },

  modalItemTextSelected: {
    fontWeight: "700",
    color: "#15803D",
  },

  header: {
    textAlign: "center",
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },

  stickyHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    zIndex: 10,
  },

  emptyItemText: {
    color: "#999", // xám nhạt
    fontStyle: "italic", // nhìn là biết option đặc biệt
  },
});
