import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { PropsEnum } from "../../types/Components.d";
import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../ui/IconLoading";
import EmptyState from "../ui/EmptyState";
import BottomSheetModalShell from "../shared/BottomSheetModalShell";
import { C } from "../../utils/helpers/colors";

type ExtraProps = {
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
  onClose,
  onSelect,
  onLoadMore,
  onSearch,
  isSearching,
  loadingMore,
  total = 0,
  loadedCount,
}: PropsEnum & ExtraProps) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 600);
  const lastSearchRef = useRef("");
  const loaded =
    loadedCount ?? items?.filter((i) => i.value !== "").length ?? 0;
  const orderedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (selectedValue === null || selectedValue === undefined) return items;

    const selectedItems = items.filter(
      (item) => String(item.value) === String(selectedValue),
    );

    if (!selectedItems.length) return items;

    const remainingItems = items.filter(
      (item) => String(item.value) !== String(selectedValue),
    );

    return [...selectedItems, ...remainingItems];
  }, [items, selectedValue]);
  const hasRealItems = orderedItems.some((item) => item.value !== "");
  const isSearchEmpty =
    searchText.trim().length > 0 && total === 0 && !isSearching;
  const isEmpty = isSearchEmpty || !hasRealItems;
  const listItems = isEmpty ? [] : orderedItems;

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
    }
  }, [visible]);

  const renderItem = ({ item }: any) => {
    const isEmptyValue = item.value === "";
    const isSelected =
      selectedValue !== null &&
      selectedValue !== undefined &&
      String(item.value) === String(selectedValue);

    return (
      <TouchableOpacity
        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
        activeOpacity={0.7}
        onPress={() => {
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
      showHandle
    >
      <Text style={styles.modalTitle}>{title}</Text>

      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm kiếm..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />

        {isSearching && (
          <IsLoading
            size="small"
            color={C.red}
            style={styles.searchSpinner}
          />
        )}
      </View>

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
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <IsLoading size="small" />
            </View>
          ) : null
        }
        ListHeaderComponent={
          isEmpty ? null : (
            <View style={styles.stickyHeader}>
              <Text style={styles.header}>
                Tổng: {total} (Đã tải: {loaded})
              </Text>
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            iconName="search-outline"
            title="Không tìm thấy dữ liệu"
            subtitle="Thử tìm kiếm với từ khóa khác"
          />
        }
        stickyHeaderIndices={isEmpty ? [] : [0]}
      />

      <TouchableOpacity
        onPress={onClose}
        style={styles.modalCancel}
        activeOpacity={0.8}
      >
        <Text style={styles.modalCancelText}>Đóng</Text>
      </TouchableOpacity>
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
    marginBottom: 12,
    textAlign: "center",
  },

  searchWrapper: {
    position: "relative",
    marginBottom: 8,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 36,
  },

  searchSpinner: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -10,
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

  modalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
  },

  modalCancelText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
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
