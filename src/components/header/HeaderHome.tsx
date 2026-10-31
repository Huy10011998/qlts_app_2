import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Text,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHomeMenuContext } from "../../screens/Home/shared/HomeMenuProvider";
import { useHomePageBackground } from "../../screens/Home/shared/homeBlockTone";
import { usePermission } from "../../hooks/usePermission";
import { navigateFromRef } from "../../navigation/navigationService";
import { WORKFLOW_VIEW_CODE } from "../../screens/Workflow/workflowMenu";
import { useThongBaoContext } from "../../screens/ThongBao/ThongBaoProvider";
import type { HeaderHomeProps } from "../../types/components.d";
import { AppColors, useStyles } from "../../utils/helpers/colors";
import HeaderPhotoBackground, {
  HEADER_RED_EDGE,
} from "./HeaderPhotoBackground";

/**
 * Header Trang chủ chỉ còn một hàng logo + nút. Từng có lời chào theo buổi kèm
 * ngày, viên giờ (trùng đồng hồ trên thanh trạng thái) và dải đệm đáy — header
 * cao ~139pt; bỏ hết theo yêu cầu (29/10) để nhường chỗ cho nội dung.
 *
 * Nền là ảnh nhà máy kèm lớp tối (đồng bộ với màn Đăng nhập / Cài đặt), viền
 * đỏ mảnh ở đáy giữ màu thương hiệu (30/10).
 */
export default function HeaderHome(_props: HeaderHomeProps) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  // Hai góc bo dưới của header lộ ra nền phía sau: phải trùng nền Trang chủ
  // (đậm hơn `bg` một nấc), không thì lộ hai mảng màu khác ở hai góc.
  const pageBackground = useHomePageBackground();
  const {
    isHomeRefreshing,
    openBlockOrderSheet,
    refreshHome,
    workflowTileCount,
  } = useHomeMenuContext();
  const { canView, loaded: permissionLoaded } = usePermission();
  const canViewWorkflow = permissionLoaded && canView(WORKFLOW_VIEW_CODE);
  // Bảng chuông dựng ở Tabs.tsx (nằm dưới các màn mở từ nó), không ở header.
  const { soChuaDoc, setBellOpen } = useThongBaoContext();

  const spin = useRef(new Animated.Value(0)).current;

  // Quay hết một vòng rồi mới dừng: cắt giữa vòng thì icon đứng nghiêng, nhìn như
  // bị treo. Vòng cuối chạy nốt trong lúc `isHomeRefreshing` đã về false.
  useEffect(() => {
    if (!isHomeRefreshing) return;

    let isActive = true;
    const spinOnce = () => {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isActive) spinOnce();
      });
    };

    spinOnce();

    return () => {
      isActive = false;
    };
  }, [isHomeRefreshing, spin]);

  const spinStyle = {
    transform: [
      {
        rotate: spin.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  return (
    // Lớp ngoài tô nền Trang chủ để hai góc bo dưới của header (như mẫu C) lộ
    // ra đúng màu nền trang, không lộ nền mặc định của navigator.
    <View style={{ backgroundColor: pageBackground }}>
      <View style={[styles.outer, { paddingTop: insets.top }]}>
        <HeaderPhotoBackground />

        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://cholimexfood.com.vn")}
            activeOpacity={0.8}
          >
            <Image
              source={require("../../assets/images/logo-cholimex-trans.jpg")}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.topActions}>
            {/* Làm mới cả trang: dùng chung lượt tải với kéo-để-làm-mới, tiện cho
                người dùng một tay hoặc khi trang đang cuộn giữa. */}
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={refreshHome}
              disabled={isHomeRefreshing}
              accessibilityRole="button"
              accessibilityLabel="Làm mới Trang chủ"
              accessibilityState={{ busy: isHomeRefreshing }}
            >
              <Animated.View style={isHomeRefreshing ? spinStyle : undefined}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
              </Animated.View>
            </TouchableOpacity>

            {/* Sắp xếp khối đặt cạnh chuông vì đây là hành động của cả trang, và
                header là chỗ duy nhất không trôi theo thứ tự khối. */}
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={openBlockOrderSheet}
              accessibilityRole="button"
              accessibilityLabel="Sắp xếp Trang chủ"
            >
              <Ionicons name="swap-vertical-outline" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Việc cần xử lý (cv-thong-bao): bảng tổng hợp việc, không phải thông
                báo nên có nút riêng cạnh chuông. Số cùng lượt tải với ô Workflow. */}
            {canViewWorkflow ? (
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.75}
                onPress={() => navigateFromRef("ViecCanXuLy")}
                accessibilityRole="button"
                accessibilityLabel={
                  workflowTileCount
                    ? `Việc cần xử lý, ${workflowTileCount} việc`
                    : "Việc cần xử lý"
                }
              >
                <MaterialCommunityIcons name="clipboard-check-outline" size={21} color="#fff" />
                {workflowTileCount > 0 ? (
                  <View style={styles.countBadge}>
                    {/* Số nằm trong viên cao cố định 18pt: không theo cỡ chữ của
                        app, phóng to là xén mất đầu số. */}
                    <Text
                      style={styles.countBadgeText}
                      allowFontScaling={false}
                    >
                      {workflowTileCount > 99 ? "99+" : workflowTileCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : null}

            {/* Thông báo (8-Mobile-ThongBao): số = chưa đọc của mọi nhóm,
                realtime qua hub; bấm mở bảng 20 thông báo mới nhất. Chỉ cần
                đăng nhập, không theo quyền màn hình. */}
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.75}
              onPress={() => setBellOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={
                soChuaDoc ? `Thông báo, ${soChuaDoc} chưa đọc` : "Thông báo"
              }
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {soChuaDoc > 0 ? (
                <View style={styles.countBadge}>
                  <Text
                    style={styles.countBadgeText}
                    allowFontScaling={false}
                  >
                    {soChuaDoc > 99 ? "99+" : soChuaDoc}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Đáy thẳng, không bo góc. `overflow: hidden` cắt phần ảnh tràn ra ngoài
    // header; nền đỏ lộ ra khi ảnh chưa tải xong.
    outer: {
      backgroundColor: c.red,
      overflow: "hidden",
      paddingBottom: HEADER_RED_EDGE,
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      // Đệm dưới 9 + dải đỏ 3 = 12 như header cũ: hàng cao 64, nội dung
      // Trang chủ không bị dời.
      paddingTop: 8,
      paddingBottom: 9,
    },
    // Logo hiện nguyên hình kèm nền trắng của file (tỷ lệ 2560×1810), không
    // khung — như màn Đăng nhập / Cài đặt. Cao 44 bằng viên logo cũ.
    logo: { width: 62, height: 44 },
    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    // Kính tối trên nền ảnh (kính trắng cũ chìm vào mảng trời sáng).
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.25)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
    },
    // Chuông và nút Việc cần xử lý dùng chung kiểu số để hàng nút một kiểu.
    countBadge: {
      position: "absolute",
      top: -5,
      right: -5,
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
    countBadgeText: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "800",
      color: c.red,
    },
  });
