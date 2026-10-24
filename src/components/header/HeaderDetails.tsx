import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  NativeStackHeaderProps,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { HeaderOptionsProps } from "../../types";
import { getGuideTopicTitle } from "../../screens/Guide/shared/guideContent";
import { AppColors, useStyles } from "../../utils/helpers/colors";

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Lớp ngoài mang nền trang theo giao diện sáng / tối — dải sóng cũ tô cứng
    // #F0F2F8 nên giao diện tối bị lộ một vệt sáng dưới header.
    shell: {
      backgroundColor: c.bg,
    },
    // Đáy thẳng như header Trang chủ. `overflow: hidden` cắt các vòng tròn
    // trang trí tràn ra ngoài header.
    outer: {
      backgroundColor: c.red,
      overflow: "hidden",
    },
    decoLarge: {
      position: "absolute",
      width: 168,
      height: 168,
      borderRadius: 84,
      backgroundColor: "rgba(255,255,255,0.09)",
      top: -44,
      right: -34,
    },
    decoMid: {
      position: "absolute",
      width: 94,
      height: 94,
      borderRadius: 47,
      backgroundColor: "rgba(255,255,255,0.08)",
      top: 18,
      right: 54,
    },
    decoSoft: {
      position: "absolute",
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: "rgba(0,0,0,0.06)",
      bottom: 18,
      left: -20,
    },
    decoBubbleOne: {
      position: "absolute",
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      top: 18,
      left: 72,
    },
    decoBubbleTwo: {
      position: "absolute",
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(255,255,255,0.18)",
      top: 52,
      left: 112,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      minHeight: 56,
    },
    sideSlot: {
      minWidth: 32,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    rightSlot: {
      alignItems: "flex-end",
    },
    rightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    titleWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    titleBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 4,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    titleBadgeIcon: {
      marginRight: 4,
    },
    titleBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "rgba(255,255,255,0.9)",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    title: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 18,
      textAlign: "center",
    },
    // Icon chỉ ~26pt; các nút dùng style này đều kèm `hitSlop` để vùng bấm
    // đạt cỡ ngón tay mà không nới rộng header.
    iconButton: {
      paddingHorizontal: 5,
    },
    qrButtonWrap: {
      position: "relative",
    },
    qrButtonDot: {
      position: "absolute",
      top: 1,
      right: 3,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: "#FFD60A",
      borderWidth: 1,
      borderColor: c.red,
    },
    // Cao đúng bằng dải sóng cũ (20) để header không đổi chiều cao — nội dung
    // của hơn 90 màn bên dưới không bị đẩy lên xuống.
    bottomSpacer: {
      height: 20,
    },
  });

export const HeaderDetails = ({
  showBackButton,
  showQrScannerButton,
  onQrScannerPress,
  helpTopicId,
}: HeaderOptionsProps = {}): NativeStackNavigationOptions => {
  return {
    headerShown: true,
    header: (props) => (
      <HeaderDetailsBar
        {...props}
        showBackButton={showBackButton}
        showQrScannerButton={showQrScannerButton}
        onQrScannerPress={onQrScannerPress}
        helpTopicId={helpTopicId}
      />
    ),
  };
};

export function HeaderDetailsModalHeader({
  title,
  onBack,
  backIcon = "arrow-back",
  badgeLabel,
  iconName,
  rightSlot,
}: {
  title: string;
  onBack?: () => void;
  backIcon?: React.ComponentProps<typeof Ionicons>["name"];
  badgeLabel?: string;
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  rightSlot?: React.ReactNode;
}) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const meta = getHeaderMeta(title);
  const resolvedBadgeLabel = badgeLabel ?? meta.badgeLabel;
  const resolvedIconName = iconName ?? meta.iconName;

  return (
    <View style={styles.shell}>
      <View style={[styles.outer, { paddingTop: insets.top }]}>
        <View style={styles.decoLarge} />
        <View style={styles.decoMid} />
        <View style={styles.decoSoft} />
        <View style={styles.decoBubbleOne} />
        <View style={styles.decoBubbleTwo} />

        <View style={styles.topBar}>
          <View style={styles.sideSlot}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={styles.iconButton}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={backIcon === "close" ? "Đóng" : "Quay lại"}
              >
                <Ionicons name={backIcon} size={26} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.titleWrap}>
            <View style={styles.titleBadge}>
              <Ionicons
                name={resolvedIconName}
                size={12}
                color="rgba(255,255,255,0.82)"
                style={styles.titleBadgeIcon}
              />
              <Text style={styles.titleBadgeText}>
                {resolvedBadgeLabel}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
          </View>

          <View style={[styles.sideSlot, styles.rightSlot]}>{rightSlot}</View>
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </View>
  );
}

function HeaderDetailsBar({
  navigation,
  options,
  route,
  showBackButton,
  showQrScannerButton,
  onQrScannerPress,
  helpTopicId,
}: NativeStackHeaderProps & HeaderOptionsProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const title =
    typeof options.title === "string" && options.title.trim()
      ? options.title
      : route.name;
  const meta = getHeaderMeta(title);
  // Màn chi tiết ghi mã bản ghi vào đây (xem AssetDetailHeaderActions): tiêu đề
  // là tên loại tài sản, cuộn qua khỏi dòng "Mã:" thì badge là chỗ duy nhất còn
  // cho biết đang xem bản ghi nào. Màn thêm việc mở từ Lịch ghi ngày đang tạo,
  // kèm icon lịch (`headerBadgeIcon`).
  const headerBadge = options as {
    headerBadgeLabel?: string;
    headerBadgeIcon?: React.ComponentProps<typeof Ionicons>["name"];
  };
  const recordLabel = headerBadge.headerBadgeLabel?.trim();
  const badgeLabel = recordLabel || meta.badgeLabel;
  const badgeIconName = recordLabel
    ? headerBadge.headerBadgeIcon ?? "pricetag-outline"
    : meta.iconName;
  const customHeaderRight =
    typeof options.headerRight === "function"
      ? options.headerRight({
          tintColor: "#fff",
          canGoBack: navigation.canGoBack(),
        })
      : null;

  const handleQrPress = () => {
    if (onQrScannerPress) {
      onQrScannerPress();
      return;
    }

    // Đẩy máy quét lên trên màn hiện tại, KHÔNG chuyển sang tab Quét: `Tabs`
    // nằm dưới các màn này trong stack gốc nên navigate sang nó là pop mất màn
    // đang xem, back xong người dùng rơi ra Trang chủ chứ không về chỗ cũ.
    (navigation as any).navigate("QrScan");
  };

  const handleHelpPress = () => {
    if (!helpTopicId) return;

    (navigation as any).navigate("GuideTopic", {
      topicId: helpTopicId,
      titleHeader: getGuideTopicTitle(helpTopicId),
    });
  };

  // Hai slot hai bên tiêu đề phải rộng bằng nhau, không thì tiêu đề lệch khỏi
  // giữa — rõ nhất ở màn có cả nút dấu hỏi và nút quét QR, bên trái chỉ có một
  // mũi tên quay lại. 34 là bề ngang một nút (icon 24 + padding 5 mỗi bên), 4 là
  // khoảng cách giữa hai nút, 36 là bề ngang nút quay lại (icon 26 + padding).
  const rightIconCount =
    (showQrScannerButton ? 1 : 0) + (helpTopicId ? 1 : 0);
  const sideSlotMinWidth = Math.max(
    36,
    rightIconCount * 34 + Math.max(0, rightIconCount - 1) * 4,
  );

  return (
    <View style={styles.shell}>
      <View style={[styles.outer, { paddingTop: insets.top }]}>
        <View style={styles.decoLarge} />
        <View style={styles.decoMid} />
        <View style={styles.decoSoft} />
        <View style={styles.decoBubbleOne} />
        <View style={styles.decoBubbleTwo} />

        <View style={styles.topBar}>
          <View style={[styles.sideSlot, { minWidth: sideSlotMinWidth }]}>
            {showBackButton ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.iconButton}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
              >
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.titleWrap}>
            <View style={styles.titleBadge}>
              <Ionicons
                name={badgeIconName}
                size={12}
                color="rgba(255,255,255,0.82)"
                style={styles.titleBadgeIcon}
              />
              <Text style={styles.titleBadgeText}>
                {badgeLabel}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
          </View>

          <View
            style={[
              styles.sideSlot,
              styles.rightSlot,
              { minWidth: sideSlotMinWidth },
            ]}
          >
            <View style={styles.rightActions}>
              {customHeaderRight}
              {helpTopicId ? (
                <TouchableOpacity
                  onPress={handleHelpPress}
                  style={styles.iconButton}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Hướng dẫn sử dụng màn hình này"
                >
                  <Ionicons name="help-circle-outline" size={24} color="#fff" />
                </TouchableOpacity>
              ) : null}
              {showQrScannerButton ? (
                <View style={styles.qrButtonWrap}>
                  <TouchableOpacity
                    onPress={handleQrPress}
                    style={styles.iconButton}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Quét QR"
                  >
                    <MaterialCommunityIcons
                      name="qrcode-scan"
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <View style={styles.qrButtonDot} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </View>
  );
}

function getHeaderMeta(title: string) {
  // NFC: tiêu đề lấy từ menu server có thể ở dạng dấu tổ hợp (NFD), khi đó
  // "mới" gõ trong code sẽ không khớp.
  const normalizedTitle = title.normalize("NFC").trim().toLowerCase();

  if (normalizedTitle.includes("camera")) {
    return {
      badgeLabel: "Camera",
      iconName: "videocam-outline" as const,
    };
  }

  if (normalizedTitle.includes("đại hội")) {
    return {
      badgeLabel: "Biểu quyết",
      iconName: "people-outline" as const,
    };
  }

  if (normalizedTitle.includes("chỉnh sửa")) {
    return {
      badgeLabel: "Cập nhật",
      iconName: "create-outline" as const,
    };
  }

  if (
    normalizedTitle.includes("thêm") ||
    normalizedTitle.includes("mới") ||
    normalizedTitle.includes("bản sao")
  ) {
    return {
      badgeLabel: "Tạo mới",
      iconName: "add-circle-outline" as const,
    };
  }

  if (
    normalizedTitle.includes("danh sách") ||
    normalizedTitle.includes("tài sản")
  ) {
    return {
      badgeLabel: "Danh sách",
      iconName: "list-outline" as const,
    };
  }

  if (normalizedTitle.includes("chi tiết")) {
    return {
      badgeLabel: "Chi tiết",
      iconName: "document-text-outline" as const,
    };
  }

  return {
    badgeLabel: "Thông tin",
    iconName: "sparkles-outline" as const,
  };
}
