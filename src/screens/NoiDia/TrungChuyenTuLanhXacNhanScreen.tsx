import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import {
  getNoiDiaErrorMessage,
  TRUNG_CHUYEN_LOCKED,
  trungChuyenTuLanh,
} from "../../services/data/callApi";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import type { FridgeSummary } from "./shared/fridgeLookup";
import { displayValue, EMPTY_VALUE } from "./shared/noiDiaFormat";

const MULTIPLE_LOCATIONS = "Nhiều vị trí";

/**
 * Giá trị cột "TỪ": các tủ trong cùng lượt có thể đang ở những vị trí khác
 * nhau, khi đó không được hiện vị trí của một tủ như thể là của cả lượt.
 */
const getCurrentValue = (
  fridges: FridgeSummary[],
  pick: (fridge: FridgeSummary) => string,
) => {
  const values = new Set(fridges.map((fridge) => displayValue(pick(fridge))));

  if (values.size === 0) return EMPTY_VALUE;
  if (values.size > 1) return MULTIPLE_LOCATIONS;

  return [...values][0];
};

export default function TrungChuyenTuLanhXacNhanScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation =
    useNavigation<StackNavigation<"TrungChuyenTuLanhXacNhan">>();
  const { fridges, nhaPhanPhoi, khachHang } =
    useRoute<StackRoute<"TrungChuyenTuLanhXacNhan">>().params;
  const { showAlertIfActive } = useSafeAlert();

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Cột "ĐẾN" lấy từ khách hàng đã chọn, không phải user tự nhập. Khách hàng
   * nào thiếu cấp nào thì lấy của NPP — server cũng suy vị trí theo đúng thứ tự
   * ưu tiên này.
   */
  const rows = useMemo(
    () => [
      {
        label: "Miền",
        from: getCurrentValue(fridges, (fridge) => fridge.mien),
        to: displayValue(
          khachHang.id_NoiDia_Mien_MoTa ?? nhaPhanPhoi.id_NoiDia_Mien_MoTa,
        ),
      },
      {
        label: "Vùng miền",
        from: getCurrentValue(fridges, (fridge) => fridge.vungMien),
        to: displayValue(
          khachHang.id_NoiDia_VungMien_MoTa ??
            nhaPhanPhoi.id_NoiDia_VungMien_MoTa,
        ),
      },
      {
        label: "Khu vực",
        from: getCurrentValue(fridges, (fridge) => fridge.khuVuc),
        to: displayValue(
          khachHang.id_NoiDia_KhuVuc_MoTa ?? nhaPhanPhoi.id_NoiDia_KhuVuc_MoTa,
        ),
      },
      {
        label: "NPP",
        from: getCurrentValue(fridges, (fridge) => fridge.nhaPhanPhoi),
        to:
          [nhaPhanPhoi.ma, nhaPhanPhoi.ten].filter(Boolean).join(" - ") ||
          EMPTY_VALUE,
      },
      {
        label: "Khách hàng",
        from: getCurrentValue(fridges, (fridge) => fridge.khachHang),
        to:
          [khachHang.ma, khachHang.ten].filter(Boolean).join(" - ") ||
          EMPTY_VALUE,
      },
    ],
    [fridges, khachHang, nhaPhanPhoi],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await trungChuyenTuLanh({
        ids: fridges.map((fridge) => fridge.id),
        idKhachHangMoi: khachHang.id,
        notes,
      });

      const updatedCount = response?.data;

      if (updatedCount === TRUNG_CHUYEN_LOCKED) {
        // Giữ nguyên lựa chọn để user báo quản trị rồi thử lại.
        showAlertIfActive(
          "Dữ liệu đang bị khoá",
          "Dữ liệu đang bị khoá, liên hệ quản trị.",
        );
        return;
      }

      if (!updatedCount || updatedCount <= 0) {
        showAlertIfActive(
          "Không trung chuyển được",
          response?.message ||
            "Không tìm thấy tủ lạnh hoặc khách hàng hợp lệ. Vui lòng kiểm tra lại.",
        );
        return;
      }

      showAlertIfActive(
        "Trung chuyển thành công",
        `Đã cập nhật ${updatedCount} tủ lạnh.`,
        [
          {
            text: "OK",
            // Về lại màn lịch sử, nơi useFocusEffect gọi lại API để thấy dòng
            // vừa tạo.
            onPress: () =>
              navigation.popTo("TrungChuyenTuLanhLichSu", {
                fridge: fridges[0],
              }),
          },
        ],
      );
    } catch (e) {
      if (!isNetworkRequestError(e)) error(e);

      showAlertIfActive(
        "Không trung chuyển được",
        isNetworkRequestError(e)
          ? "Không thể gửi yêu cầu. Vui lòng kiểm tra kết nối mạng rồi thử lại."
          : getNoiDiaErrorMessage(e, "Không thực hiện được trung chuyển."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    fridges,
    isSubmitting,
    khachHang.id,
    navigation,
    notes,
    showAlertIfActive,
  ]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>
          Chuyển {fridges.length} tủ lạnh
        </Text>

        <View style={styles.card}>
          {fridges.map((fridge) => (
            <View key={fridge.id} style={styles.fridgeRow}>
              <Ionicons name="cube-outline" size={15} color={c.textSub} />
              <Text style={styles.fridgeText} numberOfLines={1}>
                {fridge.serialNumber || fridge.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadLabel} />
            <Text style={styles.tableHeadText}>TỪ (hiện tại)</Text>
            <Text style={styles.tableHeadText}>ĐẾN (mới)</Text>
          </View>

          {rows.map((row) => {
            const isChanged = row.from !== row.to;

            return (
              <View key={row.label} style={styles.tableRow}>
                <Text style={styles.tableLabel}>{row.label}</Text>
                <Text
                  style={[styles.tableValue, isChanged && styles.tableChanged]}
                  numberOfLines={2}
                >
                  {row.from}
                </Text>
                <Text
                  style={[styles.tableValue, isChanged && styles.tableChanged]}
                  numberOfLines={2}
                >
                  {row.to}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ghi chú</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Nhập ghi chú (không bắt buộc)"
            placeholderTextColor={c.placeholder}
            multiline
            editable={!isSubmitting}
          />
        </View>

        <Text style={styles.warning}>
          Gửi là áp dụng ngay, không có bước chờ duyệt.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>XÁC NHẬN TRUNG CHUYỂN</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 24,
      gap: 12,
    },
    heading: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.red,
      marginBottom: 10,
    },
    fridgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 3,
    },
    fridgeText: {
      flex: 1,
      fontSize: 13.5,
      color: c.text,
    },
    tableHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tableHeadLabel: {
      width: 78,
    },
    tableHeadText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: "700",
      color: c.textSub,
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingVertical: 6,
    },
    tableLabel: {
      width: 78,
      fontSize: 12.5,
      color: c.textSub,
    },
    tableValue: {
      flex: 1,
      fontSize: 13,
      color: c.textSecondary,
    },
    tableChanged: {
      fontWeight: "700",
      color: c.text,
    },
    notesInput: {
      minHeight: 70,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      backgroundColor: c.input,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      textAlignVertical: "top",
    },
    warning: {
      fontSize: 12.5,
      fontStyle: "italic",
      color: c.textSub,
      textAlign: "center",
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 16,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    submitButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.red,
    },
    submitDisabled: {
      backgroundColor: c.slateBorder,
    },
    submitText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#fff",
    },
  });
