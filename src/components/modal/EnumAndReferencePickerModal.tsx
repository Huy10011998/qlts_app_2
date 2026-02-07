import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PropsEnum } from "../../types/Components.d";
import { useDebounce } from "../../hooks/useDebounce";
import IsLoading from "../ui/IconLoading";

type ExtraProps = {
  isSearching?: boolean;
  loadingMore?: boolean;
  total?: number; // tổng record backend trả về
  loadedCount?: number; // số item đã load
};

export default function EnumAndReferencePickerModal({
  visible,
  title,
  items,
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
  const loaded =
    loadedCount ?? items?.filter((i) => i.value !== "").length ?? 0;

  /* ===== SEARCH ===== */
  useEffect(() => {
    if (!visible) return;

    const isSearch = debouncedSearch.trim().length > 0;
    if (!isSearch) return;

    onSearch?.(debouncedSearch.trim());
  }, [debouncedSearch, visible]);

  useEffect(() => {
    if (!visible) {
      setSearchText("");
    }
  }, [visible]);

  /* ===== RENDER ITEM ===== */
  const renderItem = ({ item }: any) => {
    const isEmptyValue = item.value === "";

    return (
      <TouchableOpacity
        style={styles.modalItem}
        activeOpacity={0.7}
        onPress={() => {
          onSelect(item.value);
          onClose();
        }}
      >
        <Text
          style={[styles.modalItemText, isEmptyValue && styles.emptyItemText]}
        >
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <View
        style={[styles.modalContainer, { paddingBottom: insets.bottom || 16 }]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Title */}
        <Text style={styles.modalTitle}>{title}</Text>

        {/* Search */}
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
              color="#FF3333"
              style={styles.searchSpinner}
            />
          )}
        </View>

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.value ?? index)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <IsLoading size="small" />
              </View>
            ) : null
          }
          ListHeaderComponent={
            <View style={styles.stickyHeader}>
              <Text style={styles.header}>
                Tổng: {total} (Đã tải: {loaded})
              </Text>
            </View>
          }
          stickyHeaderIndices={[0]}
        />

        {/* Close */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.modalCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.modalCancelText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  modalContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  dragHandle: {
    width: 45,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
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

  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },

  modalItemText: {
    fontSize: 15,
    color: "#000",
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
