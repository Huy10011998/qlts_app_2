import React from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { C } from "../../../utils/helpers/colors";
import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import { MeetingOpinion } from "./shareholdersMeetingHelpers";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type OpinionPickerModalProps = {
  visible: boolean;
  opinions: MeetingOpinion[];
  selectedOpinionId: string;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
};

function OpinionSeparator() {
  return <View style={styles.separator} />;
}

export default function OpinionPickerModal({
  visible,
  opinions,
  selectedOpinionId,
  searchQuery,
  onChangeSearchQuery,
  onClose,
  onSelect,
}: OpinionPickerModalProps) {
  const [showSearchingIndicator, setShowSearchingIndicator] =
    React.useState(false);
  const listAnimationKey = `${opinions.length}-${searchQuery}`;

  React.useEffect(() => {
    if (!visible) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [listAnimationKey, visible]);

  React.useEffect(() => {
    if (!visible) {
      setShowSearchingIndicator(false);
      return;
    }

    setShowSearchingIndicator(true);
    const timer = setTimeout(() => {
      setShowSearchingIndicator(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  const renderOpinionItem = React.useCallback(
    ({ item }: { item: MeetingOpinion }) => {
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
    },
    [onSelect, selectedOpinionId],
  );

  return (
    <BottomSheetModalShell
      visible={visible}
      animationType="fade"
      closeOnBackdropPress
      onClose={onClose}
      overlayStyle={styles.overlay}
      sheetStyle={styles.sheet}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chọn ý kiến</Text>
      </View>

      <View style={styles.searchBox}>
        <View style={styles.searchIconWrap}>
          <MaterialCommunityIcons name="magnify" size={16} color="#8A95A3" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã hoặc tên ý kiến..."
          placeholderTextColor="#B0B8C4"
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          clearButtonMode="never"
          returnKeyType="search"
        />
        {showSearchingIndicator ? (
          <View style={styles.spinnerWrap}>
            <IsLoading size="small" color={C.red} />
          </View>
        ) : null}
        {!showSearchingIndicator && searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => onChangeSearchQuery("")}
            style={styles.clearButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color="#B0B8C4"
            />
          </TouchableOpacity>
        ) : null}
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
        renderItem={renderOpinionItem}
        ItemSeparatorComponent={OpinionSeparator}
        ListEmptyComponent={
          <EmptyState
            iconName="search-outline"
            title="Không tìm thấy ý kiến"
            subtitle="Thử tìm kiếm với từ khóa khác"
          />
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
    paddingTop: 10,
    paddingBottom: 24,
    height: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    marginBottom: 16,
  },
  title: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 52,
  },
  closeButton: {
    top: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    marginBottom: 12,
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
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "400",
    paddingVertical: 13,
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
  list: { flexGrow: 1, paddingBottom: 12 },
  listEmpty: { paddingBottom: 0 },
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
});
