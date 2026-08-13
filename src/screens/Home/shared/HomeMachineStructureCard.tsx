import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import BottomSheetModalShell from "../../../components/shared/BottomSheetModalShell";
import {
  AppColors,
  C,
  useAppColors,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
import HomeAssetPageCard from "./HomeAssetPageCard";
import type { HomeMachineUnit } from "./homeData";
import {
  formatHomeBillion,
  formatHomeNumber,
  formatHomePercent,
  getHomeRatioPercent,
} from "./homeFormat";
import { HOME_BRAND_RED } from "./homeTheme";

type HomeMachineStructureCardProps = {
  /** Giữ nguyên thứ tự nhận được (server đã sắp giảm dần theo số lượng). */
  units: HomeMachineUnit[];
  /** Chỉ đếm máy đã gán vị trí — dùng làm mẫu số của tỷ trọng. */
  totalQuantity: number;
  /** VND. */
  totalValue: number;
  /** Có phần tử = tổng giá trị đang thiếu phần tài sản ghi theo các tiền đó. */
  missingRateCurrencies: string[];
  isLoading?: boolean;
  /** Endpoint `MayMoc/dashboard` lỗi — chỉ hai card máy móc báo trống. */
  hasError?: boolean;
  onRetry?: () => void;
};

/**
 * Số đơn vị hiện thẳng trong trang. Vùng cuộn dọc lồng trong khu cuộn ngang dễ
 * nuốt mất cử chỉ vuốt ngang, nên phần còn lại đẩy sang bottom sheet riêng.
 */
const PREVIEW_UNIT_COUNT = 5;

function MachineUnitRow({
  unit,
  totalQuantity,
  maxQuantity,
}: {
  unit: HomeMachineUnit;
  totalQuantity: number;
  maxQuantity: number;
}) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const percent = getHomeRatioPercent(unit.quantity, totalQuantity);

  return (
    <View style={styles.row}>
      <View style={styles.headRow}>
        <Text
          style={[styles.label, { color: colors.textSecondary }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {unit.name}
        </Text>
        <Text
          style={[styles.value, { color: colors.text }]}
          allowFontScaling={false}
        >
          {formatHomeNumber(unit.quantity)}
        </Text>
        <Text
          style={[styles.percent, { color: colors.textMuted }]}
          allowFontScaling={false}
        >
          {formatHomePercent(percent)}
        </Text>
      </View>

      <View style={styles.barRow}>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.trackFill,
              {
                backgroundColor: C.blue,
                // Canh theo đơn vị lớn nhất chứ không theo tổng: đơn vị đầu bảng
                // cũng chỉ ~25% nên chia cho tổng thì mọi thanh đều rất ngắn.
                width: `${
                  maxQuantity > 0 ? (unit.quantity / maxQuantity) * 100 : 0
                }%`,
              },
            ]}
          />
        </View>
        <Text
          style={[styles.money, { color: colors.textMuted }]}
          allowFontScaling={false}
        >
          {`${formatHomeBillion(unit.value)} tỷ`}
        </Text>
      </View>
    </View>
  );
}

/**
 * TRANG 1 của khu cuộn ngang: cơ cấu máy móc theo ĐƠN VỊ.
 *
 * Bản web vẽ donut 6 đơn vị lớn nhất + lát "Khác"; trên điện thoại bỏ donut và
 * làm danh sách như trang CNTT — đơn vị nhiều hơn 7 loại thiết bị CNTT nên donut
 * càng vụn.
 *
 * `totalQuantity` ở đây CHỈ đếm máy đã gán vị trí nên nhỏ hơn hoặc bằng ô số
 * "Thiết bị máy móc đang quản lý" ở trên. Hai chỗ cố tình khác nhau, không ép về
 * cùng một con số và cũng không lấy chênh lệch ra làm cảnh báo.
 */
export default function HomeMachineStructureCard({
  units,
  totalQuantity,
  totalValue,
  missingRateCurrencies,
  isLoading = false,
  hasError = false,
  onRetry,
}: HomeMachineStructureCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const separatorColor = useSeparatorColor();
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const maxQuantity = units.reduce(
    (max, unit) => Math.max(max, unit.quantity),
    0,
  );
  const previewUnits = units.slice(0, PREVIEW_UNIT_COUNT);
  const hiddenCount = units.length - previewUnits.length;
  const hasUnits = units.length > 0;

  return (
    <HomeAssetPageCard
      title="Cơ cấu máy móc"
      note={
        hasUnits ? `${formatHomeNumber(totalQuantity)} thiết bị` : undefined
      }
    >
      {hasError && !hasUnits ? (
        <View style={styles.errorBox}>
          <Text
            style={[styles.errorText, { color: colors.textSecondary }]}
            allowFontScaling={false}
          >
            Chưa lấy được số liệu máy móc.
          </Text>
          {onRetry ? (
            <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
              <Text style={styles.errorAction} allowFontScaling={false}>
                Thử lại
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : isLoading && !hasUnits ? (
        Array.from({ length: 4 }).map((_, index) => (
          <View key={`machine-skeleton-${index}`} style={styles.row}>
            <View
              style={[styles.skeletonLabel, { backgroundColor: colors.border }]}
            />
            <View
              style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
            />
          </View>
        ))
      ) : !hasUnits ? (
        <Text
          style={[styles.errorText, { color: colors.textSecondary }]}
          allowFontScaling={false}
        >
          Chưa có máy móc nào đang được quản lý.
        </Text>
      ) : (
        <>
          {/* Danh sách nhận phần chiều cao dôi ra, còn dòng tổng cộng và ghi chú
              nằm sát đáy card — không thả nổi ở lưng chừng với một vùng trắng ở
              dưới. */}
          <View style={styles.list}>
            {previewUnits.map((unit) => (
              <MachineUnitRow
                key={unit.key}
                unit={unit}
                totalQuantity={totalQuantity}
                maxQuantity={maxQuantity}
              />
            ))}

            {hiddenCount > 0 ? (
              <TouchableOpacity
                style={styles.viewAll}
                onPress={() => setIsSheetVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, right: 8, bottom: 6, left: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Xem tất cả ${units.length} đơn vị`}
              >
                <Text style={styles.viewAllText} allowFontScaling={false}>
                  {`Xem tất cả ${units.length} đơn vị`}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={HOME_BRAND_RED} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: separatorColor }]}>
            <Text
              style={[styles.footerLabel, { color: colors.textSecondary }]}
              allowFontScaling={false}
            >
              Tổng cộng
            </Text>
            <Text
              style={[styles.footerValue, { color: colors.text }]}
              allowFontScaling={false}
            >
              {`${formatHomeNumber(totalQuantity)} · ${formatHomeBillion(
                totalValue,
              )} tỷ`}
            </Text>
          </View>

          <Text
            style={[styles.note, { color: colors.textMuted }]}
            allowFontScaling={false}
          >
            Giá trị = đơn giá × số lượng, đã quy đổi về VND.
          </Text>

          {/* Không nói ra thì người xem tưởng tổng giá trị đã đầy đủ. Số lượng
              vẫn luôn đúng, chỉ giá trị bị thiếu. */}
          {missingRateCurrencies.length > 0 ? (
            <Text
              style={[styles.warning, { color: C.amber }]}
              allowFontScaling={false}
            >
              {`Chưa lấy được tỷ giá ${missingRateCurrencies.join(
                ", ",
              )} — tổng giá trị đang thiếu phần tài sản ghi theo các loại tiền này.`}
            </Text>
          ) : null}
        </>
      )}

      <BottomSheetModalShell
        visible={isSheetVisible}
        closeOnBackdropPress
        onClose={() => setIsSheetVisible(false)}
        overlayStyle={styles.overlay}
        sheetStyle={[styles.sheet, { backgroundColor: colors.bg }]}
        closeButtonStyle={styles.sheetClose}
        showCloseButton
        showHandle
      >
        <Text
          style={[styles.sheetTitle, { color: colors.text }]}
          allowFontScaling={false}
        >
          Cơ cấu máy móc theo đơn vị
        </Text>
        <Text
          style={[styles.sheetSubtitle, { color: colors.textSub }]}
          allowFontScaling={false}
        >
          {`${formatHomeNumber(units.length)} đơn vị · ${formatHomeNumber(
            totalQuantity,
          )} thiết bị · ${formatHomeBillion(totalValue)} tỷ`}
        </Text>
        <ScrollView
          style={styles.sheetList}
          showsVerticalScrollIndicator={false}
        >
          {units.map((unit) => (
            <MachineUnitRow
              key={unit.key}
              unit={unit}
              totalQuantity={totalQuantity}
              maxQuantity={maxQuantity}
            />
          ))}
        </ScrollView>
      </BottomSheetModalShell>
    </HomeAssetPageCard>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    list: {
      flexGrow: 1,
    },
    row: {
      paddingVertical: 5,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    label: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: "600",
      color: c.textSecondary,
    },
    value: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      letterSpacing: -0.2,
      includeFontPadding: false,
      color: c.text,
    },
    percent: {
      width: 48,
      textAlign: "right",
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      color: c.textMuted,
    },
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 5,
    },
    track: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    trackFill: {
      height: "100%",
      borderRadius: 3,
    },
    money: {
      width: 74,
      textAlign: "right",
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      includeFontPadding: false,
      color: c.textMuted,
    },
    skeletonLabel: {
      width: "55%",
      height: 11,
      borderRadius: 5,
      marginBottom: 5,
      backgroundColor: c.border,
    },
    viewAll: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      marginTop: 6,
    },
    viewAllText: {
      fontSize: 11.5,
      fontWeight: "700",
      color: HOME_BRAND_RED,
    },
    footer: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 8,
      marginTop: 8,
      paddingTop: 9,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    footerLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      color: c.textSecondary,
    },
    footerValue: {
      fontSize: 14.5,
      lineHeight: 19,
      fontWeight: "800",
      letterSpacing: -0.3,
      includeFontPadding: false,
      color: c.text,
    },
    note: {
      fontSize: 10.5,
      lineHeight: 14,
      marginTop: 7,
      fontWeight: "600",
      color: c.textMuted,
    },
    warning: {
      fontSize: 10.5,
      lineHeight: 14,
      marginTop: 5,
      fontWeight: "700",
    },
    errorBox: {
      paddingVertical: 6,
      gap: 6,
    },
    errorText: {
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "600",
      color: c.textSecondary,
    },
    errorAction: {
      fontSize: 12,
      fontWeight: "700",
      color: HOME_BRAND_RED,
    },
    overlay: {
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    sheetClose: {
      top: 14,
      right: 14,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "700",
      paddingRight: 40,
      color: c.text,
    },
    sheetSubtitle: {
      marginTop: 4,
      marginBottom: 10,
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: "500",
      color: c.textSub,
    },
    sheetList: {
      maxHeight: 380,
    },
  });
