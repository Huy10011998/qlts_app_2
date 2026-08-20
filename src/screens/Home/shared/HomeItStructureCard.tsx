import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AppColors,
  C,
  useAppColors,
  useSeparatorColor,
  useStyles,
} from "../../../utils/helpers/colors";
import HomeAssetPageCard from "./HomeAssetPageCard";
import type { HomeDashboardItCategory } from "./homeData";
import {
  formatHomeNumber,
  formatHomePercent,
  getHomeRatioPercent,
} from "./homeFormat";

type HomeItStructureCardProps = {
  items: HomeDashboardItCategory[];
  /** Tổng 7 loại, server cộng sẵn (KHÔNG gồm camera). */
  total: number;
  isLoading?: boolean;
};

// Bảy màu cố định theo thứ tự tỷ trọng giảm dần. Chỉ dùng màu brand (giống nhau
// ở sáng/tối) để dãy thanh không đổi thứ tự màu khi đổi theme.
const BAR_COLORS = [
  C.blue,
  C.violet,
  C.emerald,
  C.amber,
  C.sky,
  C.rose,
  C.redLight,
];

/**
 * Cơ cấu thiết bị CNTT dựng bằng DANH SÁCH 7 dòng, không phải donut: bản web đã
 * phải bỏ chú giải vì 7 nhãn tự xuống hai dòng và đè lên hình, còn trên điện
 * thoại thì mấy mục nhỏ (Server ~0,9%) chỉ còn một sợi chỉ không đọc được.
 *
 * Mỗi dòng: tên · số lượng · thanh tỷ trọng · %. Đã sắp giảm dần từ mapper nên
 * hai mục lớn nhất nằm trên cùng, đọc được ngay là chúng chiếm gần 3/4.
 *
 * Đây là TRANG 3 của khu cuộn ngang CƠ CẤU TÀI SẢN, nguồn số là endpoint
 * `get-dashboard-taisan` — khác nguồn với hai trang máy móc.
 */
export default function HomeItStructureCard({
  items,
  total,
  isLoading = false,
}: HomeItStructureCardProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const separatorColor = useSeparatorColor();
  // Thanh dài nhất canh theo mục lớn nhất chứ không theo tổng: tỷ trọng lớn nhất
  // chỉ ~43% nên nếu chia cho tổng thì mọi thanh đều ngắn hơn nửa card.
  const maxValue = items.reduce((max, item) => Math.max(max, item.value), 0);

  return (
    <HomeAssetPageCard
      title="Cơ cấu thiết bị CNTT"
      note={items.length > 0 ? `${formatHomeNumber(total)} thiết bị` : undefined}
    >
      {/* Danh sách nhận phần chiều cao dôi ra; dòng tổng cộng và ghi chú nằm sát
          đáy card, giống hai trang máy móc. */}
      <View style={styles.list}>
        {isLoading && items.length === 0
          ? Array.from({ length: 4 }).map((_, index) => (
              <View key={`it-skeleton-${index}`} style={styles.row}>
                <View
                  style={[
                    styles.skeletonLabel,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View
                  style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
                />
              </View>
            ))
          : items.length === 0
          ? (
            // Nguồn số của trang này là endpoint tài sản, khác hai trang máy
            // móc: endpoint đó hỏng thì `items` rỗng và card sẽ ra khung trắng
            // không chữ nếu không nói gì ở đây.
            <Text
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              Chưa lấy được cơ cấu thiết bị CNTT.
            </Text>
          )
          : items.map((item, index) => {
              const percent = getHomeRatioPercent(item.value, total);
              const barColor = BAR_COLORS[index % BAR_COLORS.length];

              return (
                <View key={item.key} style={styles.row}>
                  <View style={styles.headRow}>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[styles.value, { color: colors.text }]}
                    >
                      {formatHomeNumber(item.value)}
                    </Text>
                    <Text
                      style={[styles.percent, { color: colors.textMuted }]}
                    >
                      {formatHomePercent(percent)}
                    </Text>
                  </View>

                  <View
                    style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <View
                      style={[
                        styles.trackFill,
                        {
                          backgroundColor: barColor,
                          width: `${
                            maxValue > 0 ? (item.value / maxValue) * 100 : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
          })}
      </View>

      {items.length > 0 ? (
        <>
          <View style={[styles.footer, { borderTopColor: separatorColor }]}>
            <Text
              style={[styles.footerLabel, { color: colors.textSecondary }]}
            >
              Tổng cộng
            </Text>
            <Text
              style={[styles.footerValue, { color: colors.text }]}
            >
              {formatHomeNumber(total)}
            </Text>
          </View>
          {/* Tổng của API không gồm camera, phải ghi ra để không ai cộng ô camera
              ở trên vào rồi thắc mắc lệch số. */}
          <Text
            style={[styles.note, { color: colors.textMuted }]}
          >
            Không tính Camera — camera được theo dõi riêng ở ô số phía trên.
          </Text>
        </>
      ) : null}
    </HomeAssetPageCard>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    list: {
      flexGrow: 1,
    },
    row: {
      paddingVertical: 6,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    label: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: "600",
      color: c.textSecondary,
    },
    value: {
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: -0.2,
      color: c.text,
    },
    percent: {
      width: 48,
      textAlign: "right",
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
    },
    track: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      marginTop: 5,
      backgroundColor: c.surfaceAlt,
    },
    trackFill: {
      height: "100%",
      borderRadius: 3,
    },
    skeletonLabel: {
      width: "55%",
      height: 11,
      borderRadius: 5,
      backgroundColor: c.border,
    },
    footer: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 9,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    footerLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSecondary,
    },
    footerValue: {
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: c.text,
    },
    note: {
      fontSize: 10.5,
      marginTop: 7,
      fontWeight: "600",
      color: c.textMuted,
    },
    emptyText: {
      fontSize: 12.5,
      fontWeight: "600",
      color: c.textSecondary,
    },
  });
