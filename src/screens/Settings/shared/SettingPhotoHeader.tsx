import React from "react";
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HeaderBellButton } from "../../../components/header/HeaderDetails";
import type { StackNavigation } from "../../../types";
import { useAppColors } from "../../../utils/helpers/colors";
import { getGuideTopicTitle } from "../../Guide/shared/guideContent";
import { useLogoutFlow } from "./useLogoutFlow";

// Ảnh nhà máy Bến Lức ghép sẵn bóng nước (login-bg-company4.jpg, 1600×1128 —
// cùng ảnh từng thử ở màn Đăng nhập): nhà máy ở trên, mặt nước phản chiếu ở
// dưới, mép nước nằm ở 331.67/564 chiều cao ảnh. Ảnh rộng 1.1 lần màn (thấy
// gần trọn dãy nhà), mép nước cao hơn mép trên thẻ hồ sơ một đoạn để lộ một
// dải nước ngay trên thẻ.
const PHOTO_ASPECT = 1600 / 1128;
const PHOTO_SHORE = 331.67 / 564;
const PHOTO_WIDTH_RATIO = 1.1;
const WATER_ABOVE_CARD = 36;
const TOP_BAR_HEIGHT = 54;
// Khoảng ảnh lộ ra giữa thanh logo và mép trên thẻ hồ sơ.
const PHOTO_GAP = 88;
// Ảnh chạy xuống sau thẻ hồ sơ ít nhất chừng này rồi nhạt dần vào nền màn.
const PHOTO_MIN_FADE = 24;
// Phía trên ảnh (vùng kéo nảy đầu trang trên iOS, hoặc khi ảnh không phủ tới
// đỉnh màn) tô màu trời ở mép trên ảnh, mép ảnh nhoà dần vào màu đó.
const BOUNCE_COVER = 400;
const SKY_COLOR = "#B2D5EC";
const SKY_BLEND = 28;

/**
 * Đầu màn Cài đặt kiểu VCB Digibank: ảnh nhà máy thay header đỏ của navigator,
 * logo bên trái, bên phải hướng dẫn, chuông, nút nguồn (đăng xuất). Thẻ hồ sơ
 * đặt ngay sau khối này, đè lên phần dưới ảnh.
 */
export default function SettingPhotoHeader() {
  const navigation = useNavigation<StackNavigation<"Settings">>();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { confirmLogout } = useLogoutFlow();

  const topBarTop = insets.top + 8;
  const headerHeight = topBarTop + TOP_BAR_HEIGHT + PHOTO_GAP;
  const imageWidth = windowWidth * PHOTO_WIDTH_RATIO;
  const imageHeight = imageWidth / PHOTO_ASPECT;
  const imageLeft = (windowWidth - imageWidth) / 2;
  const shoreY = headerHeight - WATER_ABOVE_CARD;
  const imageTop = shoreY - imageHeight * PHOTO_SHORE;
  const photoHeight = Math.max(
    imageTop + imageHeight,
    headerHeight + PHOTO_MIN_FADE,
  );

  const openHelp = () =>
    navigation.navigate("GuideTopic", {
      topicId: "cai-dat",
      titleHeader: getGuideTopicTitle("cai-dat"),
    });

  return (
    <View style={{ height: headerHeight }}>
      <View
        pointerEvents="none"
        style={[
          styles.photoWrap,
          { top: -BOUNCE_COVER, height: photoHeight + BOUNCE_COVER },
        ]}
      >
        <Image
          source={require("../../../assets/images/login-bg-company4.jpg")}
          style={[
            styles.photo,
            {
              top: BOUNCE_COVER + imageTop,
              left: imageLeft,
              width: imageWidth,
              height: imageHeight,
            },
          ]}
        />
        <LinearGradient
          colors={[SKY_COLOR, `${SKY_COLOR}00`]}
          style={[
            styles.skyBlend,
            { top: BOUNCE_COVER + imageTop, height: SKY_BLEND },
          ]}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0)"]}
          locations={[0, 0.6, 1]}
          style={[
            styles.topShade,
            { top: BOUNCE_COVER, height: topBarTop + TOP_BAR_HEIGHT + 40 },
          ]}
        />
        {/* Từ mép trên thẻ hồ sơ trở xuống ảnh nhạt dần vào nền màn (lộ ở
            hai bên thẻ). */}
        <LinearGradient
          colors={[`${colors.bg}00`, colors.bg]}
          style={[styles.bottomFade, { height: photoHeight - headerHeight }]}
        />
      </View>

      <View style={[styles.topBar, { marginTop: topBarTop }]}>
        <Image
          source={require("../../../assets/images/logo-cholimex-trans.jpg")}
          style={styles.logo}
          accessibilityLabel="Cholimex Foods"
        />
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={openHelp}
            style={styles.iconButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hướng dẫn sử dụng màn hình này"
          >
            <Ionicons name="help-circle-outline" size={27} color="#fff" />
          </TouchableOpacity>
          <HeaderBellButton size={26} />
          <TouchableOpacity
            onPress={confirmLogout}
            style={styles.iconButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
          >
            <Ionicons name="power" size={27} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: SKY_COLOR,
  },
  skyBlend: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  photo: {
    position: "absolute",
  },
  topShade: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Logo hiện nguyên hình kèm nền trắng của file, như màn Đăng nhập.
  logo: {
    width: 76,
    height: 54,
    resizeMode: "contain",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    paddingHorizontal: 5,
  },
});
