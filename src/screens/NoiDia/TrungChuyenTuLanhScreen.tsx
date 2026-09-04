import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import RecordListSkeleton from "../../components/list/RecordListSkeleton";
import { shouldShowListSkeleton } from "../../components/ui/shouldShowListSkeleton";
import AssetListEmptyState from "../../components/assets/shared/AssetListEmptyState";
import AssetListSearchBar from "../../components/assets/shared/AssetListSearchBar";
import AssetListSummaryCard from "../../components/assets/shared/AssetListSummaryCard";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import { useAppColors, useStyles } from "../../utils/helpers/colors";
import { searchFridges, type FridgeSummary } from "./shared/fridgeLookup";
import { makeNoiDiaListStyles } from "./shared/noiDiaListStyles";
import { displayValue } from "./shared/noiDiaFormat";

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Cửa vào chức năng trung chuyển từ menu Nội địa.
 *
 * Khác màn web (bảng mọi lượt chuyển), API mobile `get-list-lich-su` cố tình
 * bắt buộc `ID_NoiDia_TuLanh` — nên ở đây phải chọn tủ trước rồi mới xem được
 * lịch sử. Cho tìm trong danh sách hoặc quét QR, thay vì mở thẳng camera.
 */
export default function TrungChuyenTuLanhScreen() {
  const styles = useStyles(makeNoiDiaListStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"TrungChuyenTuLanh">>();

  const [searchText, setSearchText] = useState("");
  const [fridges, setFridges] = useState<FridgeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const keyword = searchText.trim();

    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const results = await searchFridges(keyword);
        if (!isActive) return;

        setFridges(results);
        setLoadErrorMessage(null);
      } catch (e) {
        if (!isActive) return;
        if (!isNetworkRequestError(e)) error(e);

        setFridges([]);
        setLoadErrorMessage(
          isNetworkRequestError(e)
            ? "Vui lòng kiểm tra kết nối mạng rồi thử lại."
            : "Không tải được danh sách tủ lạnh.",
        );
      } finally {
        if (isActive) {
          setIsSearching(false);
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [searchText]);

  const openHistory = useCallback(
    (fridge: FridgeSummary) =>
      navigation.navigate("TrungChuyenTuLanhLichSu", { fridge }),
    [navigation],
  );

  if (
    shouldShowListSkeleton({
      isFetching: isLoading,
      isEmpty: fridges.length === 0,
    })
  )
    return (
      <RecordListSkeleton hasSearchBar hasSummaryCard lines={4} trailing="chevron" />
    );

  const hasSearch = Boolean(searchText.trim());

  return (
    <ScreenContainer>
      <AssetListSearchBar
        placeholder="Mã / tên / số seri tủ lạnh..."
        value={searchText}
        onChangeText={setSearchText}
        isSearching={isSearching}
        onClear={() => setSearchText("")}
        badgeText={hasSearch ? "Kết quả tìm kiếm" : "Tủ lạnh gần đây"}
        summaryText={`${fridges.length} tủ`}
      />

      {fridges.length ? (
        <AssetListSummaryCard
          iconName="swap-horizontal"
          title="Chọn tủ cần trung chuyển"
          subtitle="Hoặc quét tem QR trên tủ ở tab Quét"
        />
      ) : null}

      <FlatList
        data={fridges}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          !fridges.length && styles.emptyRoot,
        ]}
        initialNumToRender={10}
        windowSize={5}
        ListEmptyComponent={
          <AssetListEmptyState
            iconName={
              loadErrorMessage ? "cloud-offline-outline" : "cube-outline"
            }
            title={
              loadErrorMessage
                ? "Không thể tải danh sách tủ lạnh"
                : hasSearch
                  ? "Không tìm thấy tủ lạnh"
                  : "Chưa có dữ liệu tủ lạnh"
            }
            subtitle={
              loadErrorMessage ??
              (hasSearch
                ? "Thử đổi từ khoá, hoặc quét tem QR trên tủ ở tab Quét."
                : "Danh sách tủ lạnh sẽ hiển thị tại đây khi có dữ liệu.")
            }
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openHistory(item)}>
            <View style={styles.avatar}>
              <Ionicons name="snow-outline" size={24} color={c.red} />
            </View>

            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>
                {item.label}
              </Text>
              <Text style={styles.text} numberOfLines={1}>
                <Text style={styles.label}>Seri: </Text>
                {displayValue(item.serialNumber)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {displayValue(item.nhaPhanPhoi)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {displayValue(item.khachHang)}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={c.textMuted}
              style={styles.chevron}
            />
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}
