import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import EmptyState from "../../../components/ui/EmptyState";
import SearchBar from "../../../components/ui/SearchBar";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import {
  locCamera,
  type CameraNotiChon,
} from "./useDanhSachCameraNoti";

type CameraNotiPickerSheetProps = {
  visible: boolean;
  danhSach: CameraNotiChon[];
  dangTai: boolean;
  loi: string | null;
  /** null = đang chọn "Tất cả camera". */
  cameraChon: CameraNotiChon | null;
  onClose: () => void;
  onSelect: (camera: CameraNotiChon | null) => void;
  onRetry: () => void;
};

/**
 * Chọn phạm vi camera cho lệnh tạm dừng.
 *
 * BE cho phép `ID_Camera = null` (mọi camera) hoặc ID của đúng một camera, nên
 * sheet này chỉ có một dòng "Tất cả camera" đứng đầu rồi tới danh sách — không
 * làm chọn nhiều.
 */
export default function CameraNotiPickerSheet({
  visible,
  danhSach,
  dangTai,
  loi,
  cameraChon,
  onClose,
  onSelect,
  onRetry,
}: CameraNotiPickerSheetProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const [tuKhoa, setTuKhoa] = useState("");

  const ketQua = useMemo(
    () => locCamera(danhSach, tuKhoa),
    [danhSach, tuKhoa],
  );

  const handleSelect = useCallback(
    (camera: CameraNotiChon | null) => {
      setTuKhoa("");
      onSelect(camera);
    },
    [onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: CameraNotiChon }) => {
      const isSelected = item.id === cameraChon?.id;

      return (
        <TouchableOpacity
          style={[
            styles.item,
            { borderColor: hairlineBorderColor },
            isSelected && styles.itemActive,
          ]}
          activeOpacity={0.9}
          onPress={() => handleSelect(item)}
        >
          <View style={styles.itemTextWrap}>
            <Text
              style={[styles.itemTitle, isSelected && styles.itemTitleActive]}
            >
              {item.ma} - {item.ten}
            </Text>
            {!!item.vung && (
              <Text style={styles.itemDesc} numberOfLines={2}>
                {item.vung}
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
    [c, cameraChon, hairlineBorderColor, handleSelect, styles],
  );

  return (
    <BottomSheetModalShell
      visible={visible}
      closeOnBackdropPress
      onClose={onClose}
      overlayStyle={styles.overlay}
      sheetStyle={styles.sheet}
      closeButtonStyle={styles.closeButton}
      showCloseButton
      showHandle
      avoidKeyboard
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chọn camera</Text>
      </View>

      <SearchBar
        value={tuKhoa}
        onChangeText={setTuKhoa}
        placeholder="Tìm theo mã, tên hoặc vùng..."
        variant="plain"
        style={styles.searchSpacing}
      />

      {/* "Tất cả camera" luôn đứng ngoài danh sách lọc: đây là lựa chọn mặc
          định, không được biến mất khi người dùng đang gõ tìm. */}
      <TouchableOpacity
        style={[
          styles.item,
          styles.itemAll,
          { borderColor: hairlineBorderColor },
          !cameraChon && styles.itemActive,
        ]}
        activeOpacity={0.9}
        onPress={() => handleSelect(null)}
      >
        <View style={styles.itemTextWrap}>
          <Text
            style={[styles.itemTitle, !cameraChon && styles.itemTitleActive]}
          >
            Tất cả camera
          </Text>
          <Text style={styles.itemDesc}>Tạm dừng thông báo của mọi camera</Text>
        </View>
        <MaterialCommunityIcons
          name={!cameraChon ? "radiobox-marked" : "radiobox-blank"}
          size={22}
          color={!cameraChon ? c.accent : c.textMuted}
        />
      </TouchableOpacity>

      {dangTai ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : loi ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>{loi}</Text>
          <TouchableOpacity onPress={onRetry} activeOpacity={0.85}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.listView}
          data={ketQua}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === "android"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            ketQua.length === 0 && styles.listEmpty,
          ]}
          renderItem={renderItem}
          ItemSeparatorComponent={CameraSeparator}
          ListEmptyComponent={
            <EmptyState
              iconName="search-outline"
              title="Không tìm thấy camera"
              subtitle="Thử tìm kiếm với từ khoá khác"
            />
          }
        />
      )}
    </BottomSheetModalShell>
  );
}

function CameraSeparator() {
  const styles = useStyles(makeStyles);
  return <View style={styles.separator} />;
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
    closeButton: { top: 10 },
    searchSpacing: { marginBottom: 12 },
    listView: { flex: 1 },
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
    itemAll: { marginBottom: 12 },
    itemActive: {
      borderColor: c.accent,
      backgroundColor: c.accentLight,
    },
    itemTextWrap: { flex: 1, paddingRight: 12 },
    itemTitle: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    itemTitleActive: { color: c.accent },
    itemDesc: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    separator: { height: 8 },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    errorText: {
      color: c.textSecondary,
      fontSize: 13,
      textAlign: "center",
    },
    retryText: {
      color: c.accent,
      fontSize: 13,
      fontWeight: "700",
    },
  });
