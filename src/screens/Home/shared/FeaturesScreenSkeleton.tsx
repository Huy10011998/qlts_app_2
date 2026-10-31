import React from "react";
import { StyleSheet, View } from "react-native";

import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { getTextScaleFactor } from "../../../utils/helpers/textScaling";
import { FEATURE_SECTIONS, makeFeatureStyles } from "../FeaturesScreen.styles";
import type { FeatureTileGroup } from "./FeatureTile";
import HomeSectionTitle from "./HomeSectionTitle";
import { getHomeCardChrome } from "./homeBlockTone";

/**
 * Ba nhóm của màn thật kèm số ô dựng sẵn.
 *
 * Tên nhóm là chuỗi cố định trong `FeaturesScreen` nên hiện được chữ THẬT; còn
 * số ô thì tuỳ quyền, chỉ biết sau `GET_MENU_ACTIVE` — đây là phần xấp xỉ duy
 * nhất, lấy theo bố cục thường gặp (Tiện ích hai hàng, hai nhóm sau một hàng).
 */
const SECTIONS: { group: FeatureTileGroup; tiles: number }[] = [
  { group: "feature", tiles: 6 },
  { group: "vehicle", tiles: 3 },
  { group: "report", tiles: 3 },
];

/**
 * Khung chờ danh mục chức năng.
 *
 * Trước đây chỗ này mượn `MenuCardSkeleton` — khung của màn DANH SÁCH, mỗi dòng
 * một thẻ ngang. Màn này lại là lưới 3 cột icon tròn trong thẻ trắng, nên khung
 * chờ vẽ ra một bố cục không hề tồn tại: chờ xong là cả trang thay hình.
 *
 * Nhãn nhóm là chính `HomeSectionTitle` với `FEATURE_SECTIONS` của màn thật (chưa
 * có số mục), thẻ và ô lưới dùng thẳng `makeFeatureStyles`, viền thẻ cũng đi qua
 * `getHomeCardChrome` với cùng màu nhóm (đỏ · xanh · tím, như `FeaturesScreen`)
 * — vẽ lại bản sao thì sửa thẻ thật là khung chờ lệch theo.
 *
 * Ô tìm kiếm KHÔNG nằm ở đây — nó ẩn sau nút kính lúp trên header; mở ra thì
 * màn dựng ô thật ngay bên trên, khỏi tô xám một thứ đã sẵn sàng.
 *
 * Nhóm user đã gập (`collapsedGroups`, đọc từ máy trước khi menu về) chỉ dựng
 * dòng nhãn như màn thật; mỗi ô có chấm nhóm ở góc icon như `GroupIconMarker`.
 */
export default function FeaturesScreenSkeleton({
  collapsedGroups,
}: {
  collapsedGroups?: FeatureTileGroup[];
}) {
  const featureStyles = useStyles(makeFeatureStyles);
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  // Cùng bảng màu `sectionColorByGroup` của `FeaturesScreen`.
  const sectionColorByGroup: Record<FeatureTileGroup, string> = {
    feature: colors.red,
    vehicle: colors.sky,
    report: colors.violet,
  };

  return (
    <View
      style={[featureStyles.scrollContent, styles.wrap]}
      accessibilityLabel="Đang tải danh mục chức năng"
    >
      {SECTIONS.map((section) => {
        const sectionColor = sectionColorByGroup[section.group];
        const meta = FEATURE_SECTIONS[section.group];
        const collapsed = collapsedGroups?.includes(section.group) ?? false;

        return (
          <View key={section.group}>
            <HomeSectionTitle
              label={meta.label}
              tone={meta.tone}
              iconName={meta.iconName}
              collapsed={collapsed}
              showChevron
            />
            {collapsed ? null : (
              <View
                style={[
                  featureStyles.sectionCard,
                  getHomeCardChrome({
                    borderColor: sectionColor,
                    shadowColor: colors.shadow,
                    accent: sectionColor,
                  }),
                ]}
              >
                <View style={featureStyles.sectionGrid}>
                  {Array.from({ length: section.tiles }).map((_, index) => (
                    <View key={`tile-${index}`} style={featureStyles.tile}>
                      <View
                        style={[
                          featureStyles.tileIconWrap,
                          { backgroundColor: colors.skeleton },
                        ]}
                      >
                        <View
                          style={[
                            styles.marker,
                            {
                              backgroundColor: colors.skeleton,
                              borderColor: colors.surface,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.tileLabelSlot}>
                        <View
                          style={[
                            styles.tileLabel,
                            index % 2 === 1 && styles.tileLabelShort,
                            { backgroundColor: colors.skeleton },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ cuối dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
    },
    // Cao đúng bằng `tileLabel` thật (một dòng: 16 × cỡ chữ app); khung chờ chỉ
    // tô một vạch trong ô đó, để hàng dưới vẫn bắt đầu đúng chỗ.
    tileLabelSlot: {
      width: "100%",
      height: 16 * getTextScaleFactor(),
      alignItems: "center",
      justifyContent: "center",
    },
    tileLabel: {
      width: "78%",
      height: 11,
      borderRadius: 5,
    },
    tileLabelShort: {
      width: "56%",
    },
    // Cùng chỗ, cùng cỡ `GroupIconMarker` của ô thật.
    marker: {
      position: "absolute",
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
    },
  });
