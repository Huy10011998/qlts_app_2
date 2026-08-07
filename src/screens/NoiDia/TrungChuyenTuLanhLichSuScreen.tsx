import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import IsLoading from "../../components/ui/IconLoading";
import AssetListEmptyState from "../../components/assets/shared/AssetListEmptyState";
import FridgeSummaryHeader from "./shared/FridgeSummaryHeader";
import AddActionFab from "../../components/add/shared/AddActionFab";
import {
  BRAND_RED,
  cardShadow,
} from "../../components/assets/shared/listTheme";
import {
  getNoiDiaErrorMessage,
  getTrungChuyenTuLanhLichSu,
  NOI_DIA_LICH_SU_TOP,
  type TrungChuyenTuLanhItem,
} from "../../services/data/callApi";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { makeNoiDiaListStyles } from "./shared/noiDiaListStyles";
import { displayValue, formatNoiDiaDateTime } from "./shared/noiDiaFormat";

/**
 * Năm cấp vị trí của một lần chuyển, dạng {cũ} → {mới}.
 *
 * Luôn dựng đủ 5 dòng kể cả cấp không đổi: người xem cần thấy cấp nào giữ
 * nguyên, nên cấp rỗng hai bên vẫn hiện dấu gạch chứ không bỏ dòng.
 */
const getTransferRows = (item: TrungChuyenTuLanhItem) => [
  {
    label: "Miền",
    from: displayValue(item.id_NoiDia_Mien_MoTa),
    to: displayValue(item.id_NoiDia_Mien_Moi_MoTa),
  },
  {
    label: "Vùng miền",
    from: displayValue(item.id_NoiDia_VungMien_MoTa),
    to: displayValue(item.id_NoiDia_VungMien_Moi_MoTa),
  },
  {
    label: "Khu vực",
    from: displayValue(item.id_NoiDia_KhuVuc_MoTa),
    to: displayValue(item.id_NoiDia_KhuVuc_Moi_MoTa),
  },
  {
    label: "NPP",
    from: displayValue(item.id_NoiDia_NhaPhanPhoi_MoTa),
    to: displayValue(item.id_NoiDia_NhaPhanPhoi_Moi_MoTa),
  },
  {
    label: "Khách hàng",
    from: displayValue(item.id_NoiDia_KhachHang_MoTa),
    to: displayValue(item.id_NoiDia_KhachHang_Moi_MoTa),
  },
];

export default function TrungChuyenTuLanhLichSuScreen() {
  const styles = useStyles(makeStyles);
  const listStyles = useStyles(makeNoiDiaListStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"TrungChuyenTuLanhLichSu">>();
  const { fridge } = useRoute<StackRoute<"TrungChuyenTuLanhLichSu">>().params;

  const [items, setItems] = useState<TrungChuyenTuLanhItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await getTrungChuyenTuLanhLichSu(fridge.id);

      setItems(Array.isArray(response?.data) ? response.data : []);
      setLoadErrorMessage(null);
    } catch (e) {
      if (!isNetworkRequestError(e)) error(e);

      setItems([]);
      setLoadErrorMessage(
        isNetworkRequestError(e)
          ? "Vui lòng kiểm tra kết nối mạng rồi thử lại."
          : getNoiDiaErrorMessage(e, "Không tải được lịch sử trung chuyển."),
      );
    }
  }, [fridge.id]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchHistory();
      setIsLoading(false);
    })();
  }, [fetchHistory]);

  // Gửi trung chuyển xong màn kia quay về đây; tải lại để thấy dòng vừa tạo.
  const isFirstFocusRef = React.useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }

      fetchHistory();
    }, [fetchHistory]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setIsRefreshing(false);
  }, [fetchHistory]);

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }, []);

  if (isLoading) return <IsLoading size="large" color={BRAND_RED} />;

  return (
    <ScreenContainer>
      <FridgeSummaryHeader
        ma={fridge.ma}
        ten={fridge.ten}
        serialNumber={items[0]?.serialNumber || fridge.serialNumber}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          listStyles.listContent,
          listStyles.listContentWithFab,
          !items.length && listStyles.emptyRoot,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[BRAND_RED]}
            tintColor={BRAND_RED}
          />
        }
        ListFooterComponent={
          items.length >= NOI_DIA_LICH_SU_TOP ? (
            <Text style={listStyles.capNotice}>
              Chỉ hiện {NOI_DIA_LICH_SU_TOP} lần chuyển gần nhất.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <AssetListEmptyState
            iconName={
              loadErrorMessage ? "cloud-offline-outline" : "swap-horizontal"
            }
            title={
              loadErrorMessage
                ? "Không thể tải lịch sử trung chuyển"
                : "Chưa có lần trung chuyển nào"
            }
            subtitle={
              loadErrorMessage ??
              "Bấm nút (+) để tạo yêu cầu trung chuyển đầu tiên cho tủ này."
            }
          />
        }
        renderItem={({ item }) => {
          const isExpanded = expandedIds.includes(item.id);

          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHead}
                onPress={() => toggleExpanded(item.id)}
              >
                <Ionicons
                  name={isExpanded ? "caret-down" : "caret-forward"}
                  size={16}
                  color={c.red}
                />
                <Text style={styles.cardDate}>
                  {formatNoiDiaDateTime(item.ngayTrungChuyen)}
                </Text>
              </TouchableOpacity>

              {isExpanded ? (
                <View style={styles.cardBody}>
                  {getTransferRows(item).map((row) => {
                    const isChanged = row.from !== row.to;

                    return (
                      <View key={row.label} style={styles.transferRow}>
                        <Text style={styles.transferLabel}>{row.label}</Text>
                        <Text
                          style={[
                            styles.transferValue,
                            isChanged && styles.transferValueChanged,
                          ]}
                          numberOfLines={2}
                        >
                          {row.from}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={13}
                          color={c.textMuted}
                        />
                        <Text
                          style={[
                            styles.transferValue,
                            isChanged && styles.transferValueChanged,
                          ]}
                          numberOfLines={2}
                        >
                          {row.to}
                        </Text>
                      </View>
                    );
                  })}

                  {item.notes?.trim() ? (
                    <Text style={styles.notes}>“{item.notes.trim()}”</Text>
                  ) : null}
                  <Text style={styles.user}>
                    Người thực hiện: {displayValue(item.log_ID_User_MoTa)}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <AddActionFab
        variant="extended"
        label="Trung chuyển"
        onPress={() =>
          navigation.navigate("TrungChuyenTuLanhChonTu", { fridges: [fridge] })
        }
      />
    </ScreenContainer>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Cùng số đo thẻ với danh sách tài sản, chỉ khác là accordion nên bo góc
    // phải cắt phần thân mở ra.
    card: {
      backgroundColor: c.surface,
      marginHorizontal: 12,
      marginVertical: 6,
      borderRadius: 16,
      overflow: "hidden",
      ...cardShadow(c),
    },
    cardHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    cardDate: {
      flex: 1,
      fontSize: 14.5,
      fontWeight: "700",
      color: c.text,
    },
    cardBody: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: 7,
    },
    transferRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    transferLabel: {
      width: 84,
      fontSize: 12.5,
      color: c.textSub,
    },
    transferValue: {
      flex: 1,
      fontSize: 13,
      color: c.textSecondary,
    },
    transferValueChanged: {
      fontWeight: "700",
      color: c.text,
    },
    notes: {
      marginTop: 6,
      fontSize: 13,
      fontStyle: "italic",
      color: c.textSecondary,
    },
    user: {
      marginTop: 2,
      fontSize: 12.5,
      color: c.textSub,
    },
  });
