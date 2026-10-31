import React, { useEffect, useState } from "react";
import {
  AppState,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  NativeStackHeaderProps,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { HeaderOptionsProps, HeaderSearchOption } from "../../types";
import { getGuideTopicTitle } from "../../screens/Guide/shared/guideContent";
import { useThongBaoContext } from "../../screens/ThongBao/ThongBaoProvider";
import { formatWeekdayName } from "../../screens/Workflow/Lich/lichHelpers";
import { AppColors, useStyles } from "../../utils/helpers/colors";
import HeaderPhotoBackground, {
  HEADER_RED_EDGE,
} from "./HeaderPhotoBackground";

/** Bề ngang khung logo ở màn gốc tab — bằng hai nút bên phải (2 × 34 + 4). */
const LOGO_SLOT_WIDTH = 72;

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Lớp ngoài mang nền trang theo giao diện sáng / tối — dải sóng cũ tô cứng
    // #F0F2F8 nên giao diện tối bị lộ một vệt sáng dưới header.
    shell: {
      backgroundColor: c.bg,
    },
    // Đáy thẳng như header Trang chủ: nền ảnh nhà máy + lớp tối + dải đỏ đáy
    // (`HeaderPhotoBackground`). `overflow: hidden` cắt phần ảnh tràn ra
    // ngoài; nền đỏ lộ ra khi ảnh chưa tải xong.
    outer: {
      backgroundColor: c.red,
      overflow: "hidden",
      paddingBottom: HEADER_RED_EDGE,
    },
    // Gọn một hàng ~54pt: trước đây nhãn là viên khung nằm TRÊN tiêu đề và dưới
    // đáy còn dải đệm 20 của đường sóng cũ — header cao 82pt, ăn chỗ nội dung.
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      // Đệm dưới 7 + dải đỏ 3 = 10 như trước khi có dải đỏ: header giữ chiều
      // cao, nội dung các màn không bị dời.
      paddingTop: 6,
      paddingBottom: 7,
      minHeight: 47,
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
    title: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 18,
      textAlign: "center",
    },
    // Nhãn phụ dưới tiêu đề (loại màn, mã bản ghi, ngày…): chữ nhỏ mờ, không
    // khung, để tiêu đề vẫn là thứ đọc trước.
    subtitle: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 1,
    },
    subtitleIcon: {
      marginRight: 4,
    },
    subtitleText: {
      fontSize: 10.5,
      fontWeight: "700",
      color: "rgba(255,255,255,0.78)",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    // Icon chỉ ~26pt; các nút dùng style này đều kèm `hitSlop` để vùng bấm
    // đạt cỡ ngón tay mà không nới rộng header.
    iconButton: {
      paddingHorizontal: 5,
    },
    // Nút kính lúp: nền và độ mờ LUÔN có giá trị (trong suốt / 1 khi thường)
    // để đổi trạng thái chỉ là đổi giá trị, không gỡ thuộc tính khỏi style.
    searchButton: {
      paddingVertical: 5,
      borderRadius: 17,
      backgroundColor: "transparent",
      opacity: 1,
    },
    // Lúc ô tìm đang mở: nền tròn mờ cho biết bấm lần nữa là đóng.
    searchButtonActive: {
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    searchButtonPressed: { opacity: 0.5 },
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
    // Logo như góc trái header Trang chủ, thấp hơn một chút cho vừa header gọn,
    // khung rộng đúng LOGO_SLOT_WIDTH để tiêu đề vẫn nằm giữa. Nền trắng cả
    // ở giao diện tối: ảnh logo là JPG nền trắng, khung tối thì lộ ô vuông trắng.
    // Logo hiện nguyên hình kèm nền trắng của file (tỷ lệ 2560×1810), không
    // khung — như Trang chủ / Đăng nhập / Cài đặt. Cao 36 bằng viên logo cũ nên
    // header không cao thêm.
    logo: { width: 51, height: 36 },
    // Số trên chuông cùng kiểu số trên chuông Trang chủ.
    bellCount: {
      position: "absolute",
      top: -6,
      right: -3,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFD60A",
      borderWidth: 1.5,
      borderColor: c.red,
    },
    bellCountText: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "800",
      color: c.red,
    },
  });

export const HeaderDetails = ({
  showBackButton,
  showQrScannerButton,
  onQrScannerPress,
  helpTopicId,
  tabRoot,
  badge,
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
        tabRoot={tabRoot}
        badge={badge}
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
        <HeaderPhotoBackground />

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
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            <View style={styles.subtitle}>
              <Ionicons
                name={resolvedIconName}
                size={11}
                color="rgba(255,255,255,0.78)"
                style={styles.subtitleIcon}
              />
              <Text style={styles.subtitleText}>
                {resolvedBadgeLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.sideSlot, styles.rightSlot]}>{rightSlot}</View>
        </View>
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
  tabRoot,
  badge,
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
  const fixedBadge = typeof badge === "object" ? badge : undefined;
  const showToday = badge === "today" && !recordLabel;
  const badgeLabel = recordLabel || fixedBadge?.label || meta.badgeLabel;
  const badgeIconName = recordLabel
    ? headerBadge.headerBadgeIcon ?? "pricetag-outline"
    : showToday
      ? "calendar-outline"
      : fixedBadge?.icon ?? meta.iconName;
  // Nút kính lúp do màn tự gắn (`useHeaderSearch`), không cố định theo stack.
  const headerSearch = (options as { headerSearch?: HeaderSearchOption })
    .headerSearch;
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
    (headerSearch ? 1 : 0) +
    (showQrScannerButton ? 1 : 0) +
    (helpTopicId ? 1 : 0) +
    (tabRoot ? 1 : 0);
  const sideSlotMinWidth = Math.max(
    tabRoot ? LOGO_SLOT_WIDTH : 36,
    rightIconCount * 34 + Math.max(0, rightIconCount - 1) * 4,
  );

  return (
    <View style={styles.shell}>
      <View style={[styles.outer, { paddingTop: insets.top }]}>
        <HeaderPhotoBackground />

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
            ) : tabRoot ? (
              // Chỉ để nhận diện, không bấm: logo Trang chủ mở website, lỡ tay
              // ở đây là văng ra trình duyệt.
              <Image
                source={require("../../assets/images/logo-cholimex-trans.jpg")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Cholimex Foods"
              />
            ) : null}
          </View>

          <View style={styles.titleWrap}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            <View style={styles.subtitle}>
              <Ionicons
                name={badgeIconName}
                size={11}
                color="rgba(255,255,255,0.78)"
                style={styles.subtitleIcon}
              />
              {showToday ? (
                <TodayBadgeText style={styles.subtitleText} />
              ) : (
                <Text style={styles.subtitleText} numberOfLines={1}>
                  {badgeLabel}
                </Text>
              )}
            </View>
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
              {headerSearch ? (
                // Pressable chứ không TouchableOpacity: nút này đổi trạng thái
                // (mở ↔ đóng) ngay trong lúc hiệu ứng mờ khi nhấn của
                // TouchableOpacity còn chạy, và trên kiến trúc mới iOS giữ lại độ
                // mờ dở dang — đóng ô tìm rồi mà icon vẫn nhạt. Mờ khi nhấn ở đây
                // là style thường, không có hiệu ứng nào để kẹt.
                <Pressable
                  onPress={headerSearch.onPress}
                  style={({ pressed }) => [
                    styles.iconButton,
                    styles.searchButton,
                    headerSearch.active ? styles.searchButtonActive : null,
                    pressed ? styles.searchButtonPressed : null,
                  ]}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    headerSearch.active ? "Đóng tìm kiếm" : "Tìm kiếm"
                  }
                  accessibilityState={{ expanded: headerSearch.active }}
                >
                  <Ionicons name="search-outline" size={24} color="#fff" />
                </Pressable>
              ) : null}
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
              {/* Ngoài cùng bên phải, đúng chỗ chuông ở Trang chủ. */}
              {tabRoot ? <HeaderBellButton /> : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Chuông của màn gốc các tab. Trước đây chỉ Trang chủ có chuông: đang ở Lịch /
 * Camera muốn xem thông báo phải quay về Trang chủ. Mở chung bảng chuông dựng ở
 * Tabs.tsx, số chưa đọc cùng nguồn với chuông Trang chủ. Màn Cài đặt (đầu màn
 * là ảnh, không dùng header này) cũng gắn chuông này.
 */
export function HeaderBellButton({ size = 24 }: { size?: number }) {
  const styles = useStyles(makeStyles);
  const { soChuaDoc, setBellOpen } = useThongBaoContext();

  return (
    <TouchableOpacity
      onPress={() => setBellOpen(true)}
      style={styles.iconButton}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        soChuaDoc ? `Thông báo, ${soChuaDoc} chưa đọc` : "Thông báo"
      }
    >
      <Ionicons name="notifications-outline" size={size} color="#fff" />
      {soChuaDoc > 0 ? (
        <View style={styles.bellCount}>
          {/* Viên cao cố định 18pt: không theo cỡ chữ của app, phóng to là
              xén mất đầu số. */}
          <Text style={styles.bellCountText} allowFontScaling={false}>
            {soChuaDoc > 99 ? "99+" : soChuaDoc}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const pad2 = (value: number) => String(value).padStart(2, "0");

/** "Thứ 5 · 29/10" — tên thứ viết như trên màn Lịch. */
const formatTodayBadge = (date: Date) =>
  `${formatWeekdayName(date)} · ${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

/**
 * Nhãn ngày hôm nay. Tab giữ màn gốc sống suốt phiên nên phải tự sang ngày mới:
 * hẹn giờ tới nửa đêm, và đọc lại khi app trở lại từ nền (hẹn giờ không chạy
 * lúc app nằm nền).
 */
function TodayBadgeText({ style }: { style: StyleProp<TextStyle> }) {
  const [label, setLabel] = useState(() => formatTodayBadge(new Date()));

  useEffect(() => {
    const refresh = () => setLabel(formatTodayBadge(new Date()));
    const nextDay = new Date();
    nextDay.setHours(24, 0, 1, 0);
    const timer = setTimeout(refresh, nextDay.getTime() - Date.now());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [label]);

  return <Text style={style}>{label}</Text>;
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
