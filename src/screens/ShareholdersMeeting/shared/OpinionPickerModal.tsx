import React from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../../../components/ui/EmptyState";
import SearchBar from "../../../components/ui/SearchBar";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
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
  const styles = useStyles(makeStyles);
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
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const [showSearchingIndicator, setShowSearchingIndicator] =
    React.useState(false);
  const listAnimationKey = `${opinions.length}-${searchQuery}`;

  React.useEffect(() => {
    if (!visible) return;

    if (Platform.OS !== "android") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
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
          style={[
            styles.item,
            { borderColor: hairlineBorderColor },
            isSelected && styles.itemActive,
          ]}
          activeOpacity={0.9}
          onPress={() => onSelect(item.id)}
        >
          <View style={styles.itemTextWrap}>
            <Text
              style={[styles.itemTitle, isSelected && styles.itemTitleActive]}
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
            color={isSelected ? c.accent : c.textMuted}
          />
        </TouchableOpacity>
      );
    },
    [c, hairlineBorderColor, onSelect, selectedOpinionId, styles],
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

      <SearchBar
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
        placeholder="Tìm theo mã hoặc tên ý kiến..."
        isSearching={showSearchingIndicator}
        style={styles.searchSpacing}
      />

      <FlatList
        style={styles.listView}
        data={opinions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 25, 35, 0.32)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.surface,
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
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      flex: 1,
      textAlign: "center",
      paddingHorizontal: 52,
    },
    closeButton: {
      top: 10,
    },
    searchSpacing: {
      marginBottom: 12,
    },
    listView: {
      flex: 1,
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    itemActive: {
      borderColor: c.accent,
      backgroundColor: c.accentLight,
    },
    itemTextWrap: { flex: 1, paddingRight: 12 },
    itemTitle: {
      color: c.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    itemTitleActive: { color: c.accent },
    itemDesc: {
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    separator: { height: 8 },
  });
