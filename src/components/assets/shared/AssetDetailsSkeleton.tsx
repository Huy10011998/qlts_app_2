import React from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { Field, TabItem } from "../../../types/index";
import { TypeProperty } from "../../../utils/Enum";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { scaledLineHeight } from "../../../utils/helpers/textScaling";
import DetailSectionTabs from "../../tabs/DetailSectionTabs";
import MenuCardSkeleton from "../../ui/MenuCardSkeleton";
import { useSkeletonPulse } from "../../ui/useSkeletonAutoFill";

const noop = () => undefined;

/**
 * Khung chờ của màn chi tiết bản ghi.
 *
 * Khác mọi khung chờ còn lại: ở đây app **đã biết trước bố cục**, nên không phải
 * đoán. `field` được màn danh sách stringify sẵn vào route param rồi
 * `useDetailViewState` parse đồng bộ, nên ngay frame đầu đã có đủ số nhóm, tên
 * nhóm, số field và nhãn từng field — chỉ GIÁ TRỊ là phải chờ `getDetails`.
 *
 * Vì vậy nó vẽ **thật** mọi thứ đã biết — thanh tab, hàng nút tên nhóm, đầu thẻ
 * nhóm, nhãn field — và chỉ tô xám chỗ giá trị: người dùng đọc được ngay bản ghi
 * sắp hiện ra những thông tin gì, và lúc dữ liệu về không có gì dịch chuyển vì
 * mọi kích thước đã đúng. Trước đây chỗ này là vòng xoay giữa màn trắng, tức là
 * tự bỏ đi bố cục mà nó đang cầm trong tay.
 */
export default function AssetDetailsSkeleton({
  groupedFields,
  tabs,
  activeTab = "list",
}: {
  groupedFields: Record<string, Field[]>;
  /**
   * Các mục của thanh tab (`TAB_ITEMS`). Bỏ trống = màn không có thanh tab (chi
   * tiết lịch sử) thì cũng không chừa chỗ.
   */
  tabs?: readonly TabItem[];
  /** Tab màn sẽ mở ra (param `activeTab`), mặc định Thông tin. */
  activeTab?: string;
}) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container} accessibilityLabel="Đang tải chi tiết">
      {tabs?.length ? (
        // Thanh tab thật: tự lọc mục theo quyền và tính bề rộng viên đang chọn
        // giống hệt lúc có dữ liệu, nên không lệch hình hay lệch chiều cao. Chặn
        // chạm vì chưa có gì để đổi.
        <View pointerEvents="none">
          <DetailSectionTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={noop}
          />
        </View>
      ) : null}

      {/*
        Thân màn theo tab sẽ mở. Tab Chi tiết: đúng khung chờ của chính
        `AssetDetailsTab` — tab đó chỉ bắt đầu tải sau khi chi tiết về, lúc ấy nó
        vẽ lại đúng khung này. Các tab còn lại (Note, Lịch sử, Tệp) có khung chờ
        riêng theo dữ liệu riêng: vẽ thẻ nhóm field ở đó là vẽ nhầm màn, nên để
        trống tới lúc đó.
      */}
      {activeTab === "list" ? (
        <GroupsSkeleton groupedFields={groupedFields} />
      ) : activeTab === "details" ? (
        <MenuCardSkeleton variant="related" paddingTop={14} />
      ) : null}
    </View>
  );
}

/** Tab Thông tin: đúng bố cục `AssetGroupScrollView` + `AssetGroupList`. */
function GroupsSkeleton({
  groupedFields,
}: {
  groupedFields: Record<string, Field[]>;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const opacity = useSkeletonPulse();
  const groups = Object.entries(groupedFields);
  const fill = { backgroundColor: colors.skeleton, opacity };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    >
      {/* Hàng nút tên nhóm chỉ có từ hai nhóm, nút đầu sáng — như màn thật. */}
      {groups.length > 1 ? (
        <View style={styles.chipBar}>
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {groups.map(([groupName], index) => (
              <View
                key={groupName}
                style={[styles.chip, index === 0 && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, index === 0 && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {groupName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {groups.map(([groupName, fields]) => (
        <View key={groupName} style={styles.groupCard}>
          {/* Lúc mở màn mọi nhóm đều đang mở (`collapsedGroups` rỗng). */}
          <View style={styles.groupHeader}>
            <View style={styles.groupTitleWrap}>
              <View style={styles.groupBullet} />
              <Text style={styles.groupTitle}>{groupName}</Text>
            </View>
            <View style={styles.groupChevron}>
              <Ionicons name="chevron-up" size={16} color={colors.red} />
            </View>
          </View>

          {fields.map((field, index) => (
            <View
              key={field.name ?? `${groupName}-${index}`}
              style={[
                styles.fieldRow,
                index < fields.length - 1 && styles.fieldDivider,
              ]}
            >
              <Text style={styles.label}>{field.moTa}</Text>
              {field.typeProperty === TypeProperty.Image ? (
                <Animated.View style={[styles.imageValue, fill]} />
              ) : field.typeProperty === TypeProperty.ImageBase64 ? (
                /*
                  Field ảnh base64 hiện ô vuông nhỏ, không phải khung 4:3. Bản chỉ
                  đọc là cột QR tính sẵn (vd NhanVien.QRCode): API không trả giá
                  trị, app tự vẽ QR từ `qrUrl` — nên chừa đúng ô QR. Dòng nào
                  không có `qrUrl` thì màn thật ẩn hẳn, nội dung dưới nhích lên
                  một lần; để trống thì ngược lại, mọi bản ghi CÓ QR đều bị đẩy
                  xuống — mà QR mới là trường hợp thường gặp.
                */
                <Animated.View
                  style={[
                    field.isReadOnly ? styles.qrValue : styles.thumbValue,
                    fill,
                  ]}
                />
              ) : (
                <Animated.View
                  style={[
                    styles.value,
                    // Dài ngắn khác nhau cho giống giá trị thật, không thành
                    // một cột vạch đều tăm tắp.
                    index % 3 === 0 && styles.valueShort,
                    index % 4 === 1 && styles.valueLong,
                    fill,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// Số đo chép từ `AssetGroupScrollView` (hàng nút, lề nội dung) và
// `AssetGroupList` (thẻ nhóm, đầu nhóm, dòng field) — sửa bên đó thì sửa cả đây.
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: c.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 20,
    },
    // Đè lề trên 16 của nội dung, nên thẻ nhóm đầu tụt xuống ~39 (hàng ~51 + 4
    // − 16) so với bản ghi một nhóm.
    chipBar: {
      marginTop: -16,
      marginHorizontal: -16,
      marginBottom: 4,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    chipRow: {
      paddingHorizontal: 16,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
    },
    chipActive: {
      backgroundColor: c.red,
      borderColor: c.red,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.onBrand,
    },
    groupCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    // Gộp `groupHeader` + `groupHeaderOpen`: cao theo ô chevron 26, không theo
    // dòng tiêu đề.
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
      paddingBottom: 12,
      marginBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    groupTitleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    groupBullet: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: c.red,
    },
    groupTitle: { flex: 1, fontSize: 15.5, fontWeight: "700", color: c.red },
    groupChevron: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
    },
    fieldRow: {
      paddingVertical: 9,
    },
    fieldDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    label: {
      fontWeight: "bold",
      color: c.textSecondary,
      fontSize: 12,
      letterSpacing: 0.2,
      marginBottom: 3,
    },
    // Giá trị thật là chữ 14 với leading 20 giãn theo Cỡ chữ của app — vạch xám
    // 14 đặt giữa đúng chiều cao dòng đó.
    value: {
      width: "58%",
      height: 14,
      marginVertical: (scaledLineHeight(14, 20 / 14) - 14) / 2,
      borderRadius: 6,
    },
    valueShort: {
      width: "34%",
    },
    valueLong: {
      width: "76%",
    },
    imageValue: {
      width: "100%",
      aspectRatio: 4 / 3,
      marginTop: 4,
      borderRadius: 12,
    },
    // `Base64ImageThumb` size 64 (bo 10) trong `base64Row` marginTop 2.
    thumbValue: {
      width: 64,
      height: 64,
      marginTop: 2,
      borderRadius: 10,
    },
    // `qrWrap`: QRCode 96 + padding 6 mỗi bên, marginTop 2.
    qrValue: {
      width: 96 + 6 * 2,
      height: 96 + 6 * 2,
      marginTop: 2,
      borderRadius: 6,
    },
  });
