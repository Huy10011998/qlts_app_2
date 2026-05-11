import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { C } from "../../../utils/helpers/colors";
import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import { MeetingOpinion } from "./shareholdersMeetingHelpers";

type OpinionPickerModalProps = {
  visible: boolean;
  opinions: MeetingOpinion[];
  selectedOpinionId: string;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export default function OpinionPickerModal({
  visible,
  opinions,
  selectedOpinionId,
  searchQuery,
  onChangeSearchQuery,
  onClose,
  onSelect,
}: OpinionPickerModalProps) {
  return (
    <BottomSheetModalShell
      visible={visible}
      animationType="fade"
      closeOnBackdropPress
      onClose={onClose}
      overlayStyle={styles.overlay}
      sheetStyle={styles.sheet}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chọn ý kiến</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={C.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã hoặc tên ý kiến..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
        />
      </View>

      <FlatList
        data={opinions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          opinions.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedOpinionId;
          const title = item.code ? `${item.code} - ${item.title}` : item.title;

          return (
            <TouchableOpacity
              style={[styles.item, isSelected && styles.itemActive]}
              activeOpacity={0.9}
              onPress={() => onSelect(item.id)}
            >
              <View style={styles.itemTextWrap}>
                <Text
                  style={[
                    styles.itemTitle,
                    isSelected && styles.itemTitleActive,
                  ]}
                >
                  {title}
                </Text>
                {!!item.description && (
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons
                name={isSelected ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={isSelected ? C.accent : C.textMuted}
              />
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không tìm thấy ý kiến phù hợp.</Text>
        }
      />
    </BottomSheetModalShell>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 25, 35, 0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    height: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { color: C.textPrimary, fontSize: 16, fontWeight: "700" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 14,
    paddingVertical: 12,
    marginLeft: 8,
  },
  list: { flexGrow: 1, paddingBottom: 12 },
  listEmpty: { justifyContent: "center" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemActive: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },
  itemTextWrap: { flex: 1, paddingRight: 12 },
  itemTitle: {
    color: C.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  itemTitleActive: { color: C.accent },
  itemDesc: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  separator: { height: 8 },
  emptyText: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
    lineHeight: 20,
    alignSelf: "center",
  },
});
