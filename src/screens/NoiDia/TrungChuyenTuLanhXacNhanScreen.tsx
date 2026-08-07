import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import { createAssetFormHeaderSubmitRight } from "../../components/assets/shared/AssetFormHeaderSubmitButton";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import {
  getKhachHangLocation,
  getNoiDiaErrorMessage,
  TRUNG_CHUYEN_LOCKED,
  trungChuyenTuLanh,
} from "../../services/data/callApi";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import type { FridgeSummary } from "./shared/fridgeLookup";
import { displayValue, EMPTY_VALUE } from "./shared/noiDiaFormat";
import NoiDiaFormScroll from "./shared/NoiDiaFormScroll";
import NoiDiaNoteCard from "./shared/NoiDiaNoteCard";

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
   * Vị trí thật của khách hàng mới, đọc từ record khách hàng vì
   * `get-list-khach-hang` chỉ trả id/mã/tên. Tải nền: bảng hiện ngay bằng dữ
   * liệu đã có, ba cấp trên thay bằng giá trị thật khi API trả về.
   */
  const [khachHangLocation, setKhachHangLocation] = useState<Awaited<
    ReturnType<typeof getKhachHangLocation>
  > | null>(null);

  useEffect(() => {
    let isActive = true;

    getKhachHangLocation(khachHang.id).then((location) => {
      if (isActive) setKhachHangLocation(location);
    });

    return () => {
      isActive = false;
    };
  }, [khachHang.id]);

  /**
   * Cột "ĐẾN" lấy từ khách hàng đã chọn, không phải user tự nhập. Khách hàng
   * nào thiếu cấp nào thì lấy của NPP — server cũng suy vị trí theo đúng thứ tự
   * ưu tiên này.
   *
   * Thứ tự ưu tiên: record khách hàng (chính xác nhất) → dữ liệu kèm trong
   * danh sách → của NPP. Cùng lắm mới suy từ cột TỪ khi NPP không đổi, vì cùng
   * một NPP thì ba cấp trên chắc chắn giữ nguyên. Tất cả chỉ để hiển thị —
   * dữ liệu lưu vẫn do server suy từ khách hàng.
   */
  const rows = useMemo(() => {
    const nppFrom = getCurrentValue(fridges, (fridge) => fridge.nhaPhanPhoi);
    const nppTo =
      [nhaPhanPhoi.ma, nhaPhanPhoi.ten].filter(Boolean).join(" - ") ||
      EMPTY_VALUE;
    const keepsNpp = nppTo !== EMPTY_VALUE && nppTo === nppFrom;

    const inherited = (from: string, value?: string | null) => {
      const known = displayValue(value);
      if (known !== EMPTY_VALUE) return known;

      return keepsNpp ? from : EMPTY_VALUE;
    };

    const mienFrom = getCurrentValue(fridges, (fridge) => fridge.mien);
    const vungMienFrom = getCurrentValue(fridges, (fridge) => fridge.vungMien);
    const khuVucFrom = getCurrentValue(fridges, (fridge) => fridge.khuVuc);

    return [
      {
        label: "Miền",
        from: mienFrom,
        to: inherited(
          mienFrom,
          khachHangLocation?.mien ||
            khachHang.id_NoiDia_Mien_MoTa ||
            nhaPhanPhoi.id_NoiDia_Mien_MoTa,
        ),
      },
      {
        label: "Vùng miền",
        from: vungMienFrom,
        to: inherited(
          vungMienFrom,
          khachHangLocation?.vungMien ||
            khachHang.id_NoiDia_VungMien_MoTa ||
            nhaPhanPhoi.id_NoiDia_VungMien_MoTa,
        ),
      },
      {
        label: "Khu vực",
        from: khuVucFrom,
        to: inherited(
          khuVucFrom,
          khachHangLocation?.khuVuc ||
            khachHang.id_NoiDia_KhuVuc_MoTa ||
            nhaPhanPhoi.id_NoiDia_KhuVuc_MoTa,
        ),
      },
      {
        label: "NPP",
        from: nppFrom,
        to: nppTo,
      },
      {
        label: "Khách hàng",
        from: getCurrentValue(fridges, (fridge) => fridge.khachHang),
        to:
          [khachHang.ma, khachHang.ten].filter(Boolean).join(" - ") ||
          EMPTY_VALUE,
      },
    ];
  }, [fridges, khachHang, khachHangLocation, nhaPhanPhoi]);

  // Đổi NPP mà API không trả ba cấp trên thì cột ĐẾN đành để trống — nói rõ là
  // server sẽ tự điền, tránh user tưởng vị trí sắp bị xoá.
  const hasUnknownTarget = rows
    .slice(0, 3)
    .some((row) => row.to === EMPTY_VALUE);

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

  // Nút gửi nằm ở header như mọi form tài sản. Giữ handler trong ref để
  // `setOptions` chỉ chạy lại khi trạng thái gửi đổi, không phải sau mỗi ký tự
  // ghi chú.
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: createAssetFormHeaderSubmitRight({
        disabled: isSubmitting,
        iconName: isSubmitting ? "hourglass-outline" : "swap-horizontal",
        label: isSubmitting ? "Đang gửi" : "Chuyển",
        onPress: () => handleSubmitRef.current(),
      }),
    });
  }, [isSubmitting, navigation]);

  return (
    <ScreenContainer>
      <NoiDiaFormScroll contentContainerStyle={styles.content}>
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
            <Text style={styles.tableHeadText}>Vị trí sau khi chuyển</Text>
          </View>

          {/*
            Mỗi cấp xếp DỌC chứ không phải hai cột: dòng trên là hiện tại, dòng
            dưới có mũi tên là giá trị mới. Chia đôi bề ngang thì tên NPP / khách
            hàng bị bó vào nửa màn, xuống bốn năm dòng hoặc bị cắt — mà đây là
            màn cuối trước khi gửi, đọc nhầm là chuyển nhầm.

            Cấp nào không đổi thì chỉ hiện một dòng: lặp lại y hệt hai lần chỉ
            làm loãng, mắt phải tự dò xem có khác gì không.
          */}
          {rows.map((row, index) => {
            const isChanged = row.from !== row.to;
            // Kẻ ngăn giữa các cấp. Cấp cuối không kẻ, tránh đường thừa sát
            // mép thẻ.
            const isLast = index === rows.length - 1;

            return (
              <View
                key={row.label}
                style={[styles.tableRow, !isLast && styles.tableRowDivider]}
              >
                <View style={styles.tableLine}>
                  <Text style={styles.tableLabel}>{row.label}</Text>
                  <Text style={styles.tableValue}>{row.from}</Text>
                </View>

                {isChanged ? (
                  <View style={styles.tableLine}>
                    <View style={styles.tableArrowSlot}>
                      <Ionicons name="arrow-forward" size={14} color={c.red} />
                    </View>
                    <Text style={[styles.tableValue, styles.tableChanged]}>
                      {row.to}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {hasUnknownTarget ? (
            <Text style={styles.tableNote}>
              Miền / Vùng miền / Khu vực do hệ thống xác định theo khách hàng
              mới sau khi gửi.
            </Text>
          ) : null}
        </View>

        <NoiDiaNoteCard
          value={notes}
          onChangeText={setNotes}
          editable={!isSubmitting}
        />

        <Text style={styles.warning}>
          Gửi là áp dụng ngay, không có bước chờ duyệt.
        </Text>
      </NoiDiaFormScroll>
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
    tableHeadText: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: "700",
      color: c.textSub,
      textTransform: "uppercase",
    },
    /** Một cấp vị trí: xếp dọc, dòng hiện tại rồi tới dòng mới. */
    tableRow: {
      paddingVertical: 6,
      gap: 3,
    },
    /** Một dòng trong cấp đó: cột nhãn cố định + giá trị chiếm hết phần còn lại. */
    tableLine: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    tableRowDivider: {
      // `c.border` (#F3F5F9) gần như trùng nền thẻ nên nhìn không ra kẻ; dùng
      // `borderStrong` và bỏ hairline để thấy rõ trên cả light lẫn dark.
      borderBottomWidth: 1,
      borderBottomColor: c.borderStrong,
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
    /**
     * Mũi tên nằm đúng cột nhãn của dòng trên, dồn sát phải để chỉ thẳng vào
     * giá trị mới.
     */
    tableArrowSlot: {
      width: 78,
      alignItems: "flex-end",
      paddingRight: 2,
    },
    tableChanged: {
      fontWeight: "700",
      color: c.text,
    },
    tableNote: {
      marginTop: 8,
      fontSize: 12,
      fontStyle: "italic",
      color: c.textSub,
    },
    warning: {
      fontSize: 12.5,
      fontStyle: "italic",
      color: c.textSub,
      textAlign: "center",
    },
  });
