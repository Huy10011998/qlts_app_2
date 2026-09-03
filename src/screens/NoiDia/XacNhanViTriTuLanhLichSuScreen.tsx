import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import RecordListSkeleton from "../../components/list/RecordListSkeleton";
import { shouldShowListSkeleton } from "../../components/ui/shouldShowListSkeleton";
import IsLoading from "../../components/ui/IconLoading";
import AssetListEmptyState from "../../components/assets/shared/AssetListEmptyState";
import FridgeSummaryHeader from "./shared/FridgeSummaryHeader";
import CapNhatToaDoKhachHangBanner from "./shared/CapNhatToaDoKhachHangBanner";
import AddActionFab from "../../components/add/shared/AddActionFab";
import { makeSharedAssetListStyles } from "../../components/assets/shared/listStyles";
import { BRAND_RED } from "../../components/assets/shared/listTheme";
import { DatePicker } from "../../components/dataPicker/DataPicker";
import {
  getNoiDiaErrorMessage,
  getXacNhanViTriTuLanhLichSu,
  NOI_DIA_LICH_SU_TOP,
  type XacNhanViTriTuLanhItem,
} from "../../services/data/callApi";
import { useNoiDiaTuLanhPermissions } from "./shared/useNoiDiaTuLanhPermissions";
import { useReloadPermissions } from "../../hooks/useReloadPermissions";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import {
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { NoiDiaPhotoViewer, NoiDiaThumbnail } from "./shared/NoiDiaPhoto";
import { makeNoiDiaListStyles } from "./shared/noiDiaListStyles";
import {
  displayValue,
  EMPTY_VALUE,
  formatKhoangCach,
  formatNoiDiaDateTime,
  isKhoangCachXa,
} from "./shared/noiDiaFormat";

/** Mở app bản đồ mặc định của máy tại toạ độ đã ghi nhận. */
const openMap = (lat: string, lng: string, label: string) => {
  const url = Platform.select({
    ios: `maps://?q=${encodeURIComponent(label)}&ll=${lat},${lng}`,
    default: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`,
  });

  Linking.openURL(url).catch(() =>
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    ),
  );
};

/** "06-08-2026" (định dạng của DatePicker) → "2026-08-06" cho API. */
const toApiDate = (value: string) => {
  const [day, month, year] = value.split("-");

  return day && month && year ? `${year}-${month}-${day}` : undefined;
};

/**
 * Lịch sử xác nhận vị trí của MỘT tủ lạnh — cửa vào chức năng.
 *
 * Cùng khuôn với lịch sử trung chuyển: mở từ menu ☰ trên header màn chi tiết
 * (quét QR hoặc danh sách tài sản), xem lại các lượt đã xác nhận, nút dưới góc
 * phải để thêm lượt mới. Tủ luôn biết trước nên không có bước quét ở đây.
 */
export default function XacNhanViTriTuLanhLichSuScreen() {
  // Banner cập nhật toạ độ và nút xác nhận ẩn/hiện theo quyền, mà quyền chỉ nằm
  // trong store — không tự mới lại. Nạp lại mỗi lần màn được focus, cùng cách
  // các màn chi tiết tài sản đang làm.
  useReloadPermissionsOnFocus();

  const reloadPerms = useReloadPermissions();
  const { canXemXacNhanViTri, canThemXacNhanViTri, loaded } =
    useNoiDiaTuLanhPermissions();
  const styles = useStyles(makeNoiDiaListStyles);
  const sharedStyles = useStyles(makeSharedAssetListStyles);
  const hairlineBorderColor = useHairlineBorderColor();
  const c = useAppColors();
  const navigation =
    useNavigation<StackNavigation<"XacNhanViTriTuLanhLichSu">>();
  const { fridge } = useRoute<StackRoute<"XacNhanViTriTuLanhLichSu">>().params;

  const [items, setItems] = useState<XacNhanViTriTuLanhItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // Đổi bộ lọc chỉ được quay spinner nhỏ, KHÔNG thay cả màn bằng loader — làm
  // vậy thì bảng chọn ngày đang mở bị gỡ khỏi cây, nhìn như màn tự tải lại.
  const [isFiltering, setIsFiltering] = useState(false);
  const hasLoadedOnceRef = React.useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  // Ngày đang chọn và ngày ĐÃ áp dụng là hai thứ khác nhau: chọn "Từ ngày" xong
  // mà bắn API luôn thì người dùng nhận một lượt lọc nửa vời, rồi chọn nốt
  // "Đến ngày" lại bắn lần nữa — lý do màn web để một nút [Lọc] riêng.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filter = useMemo(
    () => ({
      idNoiDiaTuLanh: fridge.id,
      tuNgay: toApiDate(appliedFromDate),
      denNgay: toApiDate(appliedToDate),
    }),
    [appliedFromDate, appliedToDate, fridge.id],
  );

  const fetchHistory = useCallback(async () => {
    // Không có quyền xem thì đừng gọi API cho ăn 403 — màn dưới hiện trạng thái
    // "không có quyền" thay cho danh sách.
    if (!canXemXacNhanViTri) return;

    try {
      const response = await getXacNhanViTriTuLanhLichSu(filter);

      setItems(Array.isArray(response?.data) ? response.data : []);
      setLoadErrorMessage(null);
    } catch (e) {
      if (!isNetworkRequestError(e)) error(e);

      setItems([]);
      setLoadErrorMessage(
        isNetworkRequestError(e)
          ? "Vui lòng kiểm tra kết nối mạng rồi thử lại."
          : getNoiDiaErrorMessage(e, "Không tải được lịch sử xác nhận."),
      );
    }
  }, [canXemXacNhanViTri, filter]);

  useEffect(() => {
    let isActive = true;

    if (hasLoadedOnceRef.current) setIsFiltering(true);

    (async () => {
      await fetchHistory();
      if (!isActive) return;

      hasLoadedOnceRef.current = true;
      setIsInitialLoading(false);
      setIsFiltering(false);
    })();

    return () => {
      isActive = false;
    };
  }, [fetchHistory]);

  // Xác nhận xong quay về đây, phải thấy ngay lượt vừa gửi.
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
    // Kéo reload soi lại cả quyền, không riêng danh sách: quyền vừa được cấp
    // trên web thì phải thấy ngay ở đây, khỏi phải back ra vào lại.
    await Promise.all([fetchHistory(), reloadPerms()]);
    setIsRefreshing(false);
  }, [fetchHistory, reloadPerms]);

  const applyDateFilter = useCallback(() => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setIsFilterOpen(false);
  }, [fromDate, toDate]);

  const clearDateFilter = useCallback(() => {
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
  }, []);

  // Chờ cả quyền: `loaded` false thì `can()` trả false, render sớm là nháy màn
  // "không có quyền" rồi mới ra danh sách.
  if (
    !loaded ||
    shouldShowListSkeleton({
      isFetching: isInitialLoading,
      isEmpty: items.length === 0,
    })
  )
    return <RecordListSkeleton hasSummaryCard hasBanner lines={4} />;

  if (!canXemXacNhanViTri) {
    return (
      <ScreenContainer>
        <FridgeSummaryHeader
          ma={fridge.ma}
          ten={fridge.ten}
          serialNumber={fridge.serialNumber}
        />
        <AssetListEmptyState
          iconName="lock-closed-outline"
          title="Bạn không có quyền truy cập"
          subtitle="Tài khoản hiện tại không có quyền xem lịch sử xác nhận vị trí tủ lạnh."
        />
      </ScreenContainer>
    );
  }

  const hasDateFilter = Boolean(appliedFromDate || appliedToDate);
  const dateSummary = hasDateFilter
    ? `${appliedFromDate || "…"} → ${appliedToDate || "…"}`
    : "Tất cả thời gian";
  const hasPendingDateChange =
    fromDate !== appliedFromDate || toDate !== appliedToDate;

  // Thẻ tủ + cảnh báo + bộ lọc cuộn theo danh sách thay vì đóng đinh trên đầu:
  // ba khối này chiếm gần nửa màn, để cố định thì phần còn lại chỉ hiện được hai
  // lượt. Người dùng chỉ cần chúng lúc mới vào màn.
  const listHeader = (
    <>
      <FridgeSummaryHeader
        ma={fridge.ma}
        ten={fridge.ten}
        serialNumber={items[0]?.serialNumber || fridge.serialNumber}
      />

      {/* API lịch sử trả lượt mới nhất trước, nên items[0] là lượt gần nhất. */}
      <CapNhatToaDoKhachHangBanner
        idKhachHang={fridge.idKhachHang}
        khachHang={fridge.khachHang}
        khoangCachMet={items[0]?.khoangCachMet}
        hasHistory={items.length > 0}
      />

      <View style={sharedStyles.stickyHeader}>
        <TouchableOpacity
          style={[
            sharedStyles.filterCard,
            { borderColor: hairlineBorderColor },
          ]}
          onPress={() => setIsFilterOpen((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={sharedStyles.filterCardIcon}>
            <Ionicons name="calendar-outline" size={16} color={BRAND_RED} />
          </View>
          <View style={sharedStyles.filterCardContent}>
            <Text
              style={sharedStyles.filterCardTitle}
              numberOfLines={1}
            >
              {items.length} lượt xác nhận
            </Text>
            <Text
              style={sharedStyles.filterCardSub}
              numberOfLines={1}
            >
              {dateSummary}
            </Text>
          </View>
          {isFiltering ? (
            <IsLoading
              size="small"
              color={BRAND_RED}
              style={styles.inlineSpinner}
            />
          ) : (
            <Ionicons
              name={isFilterOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={c.textMuted}
            />
          )}
        </TouchableOpacity>

        {isFilterOpen ? (
          <>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Từ ngày</Text>
                <DatePicker value={fromDate} onChange={setFromDate} />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Đến ngày</Text>
                <DatePicker value={toDate} onChange={setToDate} />
              </View>
            </View>

            <View style={styles.filterActions}>
              {hasDateFilter || fromDate || toDate ? (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={clearDateFilter}
                >
                  <Ionicons name="close-circle" size={15} color={BRAND_RED} />
                  <Text style={styles.clearFilterText}>Xoá lọc</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              <TouchableOpacity
                style={[
                  styles.applyFilterButton,
                  !hasPendingDateChange && styles.applyFilterButtonDisabled,
                ]}
                disabled={!hasPendingDateChange}
                onPress={applyDateFilter}
              >
                <Text style={styles.applyFilterText}>Lọc</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    </>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={items}
        ListHeaderComponent={listHeader}
        keyExtractor={(item) => String(item.id)}
        // Không dùng emptyRoot ở đây: header nằm trong danh sách nên căn giữa
        // theo chiều dọc sẽ đẩy luôn cả thẻ tủ xuống giữa màn.
        contentContainerStyle={[styles.listContent, styles.listContentWithFab]}
        initialNumToRender={10}
        windowSize={5}
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
            <Text style={styles.capNotice}>
              Chỉ hiện {NOI_DIA_LICH_SU_TOP} lượt gần nhất. Thu hẹp khoảng ngày
              để xem các lượt cũ hơn.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <AssetListEmptyState
            iconName={
              loadErrorMessage ? "cloud-offline-outline" : "camera-outline"
            }
            title={
              loadErrorMessage
                ? "Không thể tải lịch sử xác nhận"
                : hasDateFilter
                ? "Không có lượt xác nhận trong khoảng này"
                : "Chưa có lượt xác nhận nào"
            }
            subtitle={
              loadErrorMessage ??
              (hasDateFilter
                ? "Thử mở rộng khoảng thời gian."
                : canThemXacNhanViTri
                  ? "Bấm nút bên dưới để chụp ảnh xác nhận tủ này."
                  : "Tủ này chưa được xác nhận vị trí lần nào.")
            }
          />
        }
        renderItem={({ item }) => {
          const hasCoordinates = Boolean(item.lat && item.lng);
          const khoangCach = formatKhoangCach(item.khoangCachMet);
          const isXa = isKhoangCachXa(item.khoangCachMet);

          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <NoiDiaThumbnail
                  filePath={item.filePath}
                  size={48}
                  onPress={() => setPreviewPath(item.filePath ?? null)}
                />
              </View>

              <View style={styles.info}>
                <Text style={styles.cardDate}>
                  {formatNoiDiaDateTime(item.ngayXacNhan)}
                </Text>
                <Text style={styles.text} numberOfLines={1}>
                  <Text style={styles.label}>Seri: </Text>
                  {displayValue(item.serialNumber)}
                </Text>
                {khoangCach ? (
                  <Text style={styles.text} numberOfLines={1}>
                    <Text style={styles.label}>Cách khách hàng: </Text>
                    <Text style={isXa ? styles.textDanger : undefined}>
                      {khoangCach}
                    </Text>
                  </Text>
                ) : null}
                {item.ghiChu?.trim() ? (
                  <Text style={styles.note} numberOfLines={3}>
                    <Text style={styles.noteLabel}>Ghi chú: </Text>
                    {item.ghiChu.trim()}
                  </Text>
                ) : null}

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>
                    NV: {displayValue(item.log_ID_User_MoTa)}
                  </Text>

                  {hasCoordinates ? (
                    <TouchableOpacity
                      style={styles.footerAction}
                      hitSlop={8}
                      onPress={() =>
                        openMap(
                          item.lat as string,
                          item.lng as string,
                          item.id_NoiDia_TuLanh_MoTa || "Vị trí tủ lạnh",
                        )
                      }
                    >
                      <Ionicons name="location" size={14} color={BRAND_RED} />
                      <Text style={styles.footerActionText}>Xem bản đồ</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.meta, styles.footerAction]}>
                      {EMPTY_VALUE} toạ độ
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {canThemXacNhanViTri ? (
        <AddActionFab
          variant="extended"
          iconName="camera"
          label="Xác nhận"
          onPress={() =>
            navigation.navigate("XacNhanViTriTuLanhForm", { fridge })
          }
        />
      ) : null}

      <NoiDiaPhotoViewer
        filePath={previewPath}
        visible={Boolean(previewPath)}
        onClose={() => setPreviewPath(null)}
      />
    </ScreenContainer>
  );
}
