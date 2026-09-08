import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {
  AppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { useSkeletonAutoFill } from "../../ui/useSkeletonAutoFill";

/** Nhãn + ô nhập + `marginBottom` của `fieldBlock` — xem `assetFormStyles.ts`. */
const FIELD_ROW_HEIGHT = 13 + 7 + 48 + 14;

/** Số field mỗi nhóm dựng sẵn: nhóm đầu dài hơn, giống phần lớn danh mục. */
const GROUP_FIELD_COUNTS = [4, 3];

/**
 * Khung chờ của form thêm nhanh trong sheet chọn reference
 * (`ReferenceQuickAddForm`), lúc chờ `getFieldActive` + `getPropertyClass`.
 *
 * Trước đây chỗ này là vòng xoay nhỏ canh giữa sheet: bấm nút (+) xong là cả
 * thân sheet trống một nhịp rồi mới đổ ra hai thẻ nhóm field.
 *
 * Khác `AssetDetailsSkeleton`: ở đây app **chưa biết** field nào vì cấu hình
 * class chính là thứ đang tải, nên nhãn phải là vạch xám chứ không phải chữ
 * thật, và số nhóm/số field là con số dựng sẵn. Kích thước từng khối vẫn lấy
 * đúng của `assetFormStyles` để lúc form thật thay vào không xê dịch.
 *
 * Thẻ nhóm và ô nhập là hộp có VIỀN, chỉ nhãn và lòng ô mới tô xám — vẽ thành
 * khối xám đặc là lệch hình dáng, giống lưu ý ở `RecordListSkeleton`.
 */
export default function AssetFormSkeleton() {
  const styles = useStyles(makeStyles);
  const hairlineBorderColor = useHairlineBorderColor();
  // Sheet cao cố định nên truyền số hàng, không đo được như khung chờ cả màn.
  const { opacity } = useSkeletonAutoFill(FIELD_ROW_HEIGHT, 1);

  return (
    <View style={styles.wrap} accessibilityLabel="Đang tải biểu mẫu">
      {GROUP_FIELD_COUNTS.map((fieldCount, groupIndex) => (
        <View
          key={`group-${groupIndex}`}
          style={[styles.groupCard, { borderColor: hairlineBorderColor }]}
        >
          <View style={styles.groupHeader}>
            <Animated.View style={[styles.groupIcon, { opacity }]} />
            <Animated.View
              style={[
                styles.groupTitle,
                groupIndex % 2 === 1 && styles.groupTitleShort,
                { opacity },
              ]}
            />
            <Animated.View style={[styles.chevron, { opacity }]} />
          </View>

          {Array.from({ length: fieldCount }).map((_, fieldIndex) => (
            <View key={`field-${fieldIndex}`} style={styles.fieldBlock}>
              <Animated.View
                style={[
                  styles.label,
                  fieldIndex % 3 === 1 && styles.labelShort,
                  { opacity },
                ]}
              />
              <Animated.View style={[styles.input, { opacity }]} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy sheet thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
    },
    groupCard: {
      backgroundColor: c.surface,
      padding: 14,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    groupIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      marginRight: 10,
      backgroundColor: c.skeleton,
    },
    groupTitle: {
      flex: 1,
      maxWidth: "52%",
      height: 15,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    groupTitleShort: {
      maxWidth: "38%",
    },
    chevron: {
      width: 28,
      height: 28,
      marginLeft: "auto",
      borderRadius: 9,
      backgroundColor: c.skeleton,
    },
    fieldBlock: {
      marginBottom: 14,
    },
    label: {
      width: "44%",
      height: 13,
      marginBottom: 7,
      borderRadius: 6,
      backgroundColor: c.skeleton,
    },
    labelShort: {
      width: "30%",
    },
    input: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.input,
    },
  });
