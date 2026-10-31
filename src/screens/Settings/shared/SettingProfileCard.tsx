import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { C } from "../../../utils/helpers/colors";
import { getNameInitials } from "../../../utils/helpers/string";

type SettingProfileCardProps = {
  name?: string;
  /** Chức danh dưới tên; chưa có thì ghi "Thành viên". */
  title?: string;
  /** Mã nhân viên. */
  code?: string;
  /** Bộ phận (ngắn, sát việc hơn), không có thì phòng ban. */
  unit?: string;
  avatarUrl?: string;
  onPress: () => void;
  onQrPress: () => void;
  onChangePasswordPress: () => void;
};

const CARD_GRADIENT = [C.redLight, C.red, C.redDeep];
const CARD_GRADIENT_LOCATIONS = [0, 0.45, 1];

/**
 * Thẻ hồ sơ đầu màn Cài đặt, dựng theo thẻ tài khoản của VCB Digibank: nền đỏ,
 * ảnh + TÊN, chức danh "›" (mở Hồ sơ cá nhân), Mã NV và Bộ phận ở chỗ số tài
 * khoản / số dư, nút QR (danh thiếp) bên phải hai dòng đó, dải dưới là hai lối
 * tắt.
 *
 * Mọi hàng cao cố định (80 + 2×30 + 6 + 48 = 194) để khung chờ
 * (`SettingScreenSkeleton`) vẽ đúng cỡ, dữ liệu về không bị giật. Riêng hàng
 * đầu chỉ cao thêm khi Cỡ chữ của app lớn.
 */
export default function SettingProfileCard({
  name,
  title,
  code,
  unit,
  avatarUrl,
  onPress,
  onQrPress,
  onChangePasswordPress,
}: SettingProfileCardProps) {
  return (
    // Nền đỏ đặc ở lớp ngoài: Android cần nền mới đổ bóng `elevation`; lớp
    // trong mới cắt góc (cắt ở lớp ngoài thì iOS mất bóng).
    <View style={styles.shadow}>
      <View style={styles.card}>
        <LinearGradient
          colors={CARD_GRADIENT}
          locations={CARD_GRADIENT_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.decoRing} pointerEvents="none" />

        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Hồ sơ cá nhân, ${name || "chưa có tên"}`}
          >
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.initials}>{getNameInitials(name)}</Text>
              )}
            </View>
            <View style={styles.identityText}>
              {/* Một dòng, tự co: họ tên 5 chữ xuống dòng thì rớt lẻ một chữ cuối. */}
              <Text
                style={styles.name}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {name ? name.toUpperCase() : "---"}
              </Text>
              <View style={styles.titleRow}>
                {/* Hàng này không còn chung với nút QR nên đủ chỗ cho chức danh
                    một dòng; dài quá thì co chữ thay vì cắt "…". */}
                <Text
                  style={styles.title}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {title || "Thành viên"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="rgba(255,255,255,0.85)"
                />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Nút QR nằm bên phải hai dòng Mã NV / Bộ phận (chỗ trống sẵn),
            nhường cả hàng trên cho tên và chức danh. */}
        <View style={styles.infoBlock}>
          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Mã NV
              </Text>
              <Text style={styles.infoCode} numberOfLines={1}>
                {code || "—"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text
                style={styles.infoLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Bộ phận
              </Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {unit || "—"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.qrPill}
            activeOpacity={0.75}
            onPress={onQrPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Danh thiếp QR"
          >
            <MaterialCommunityIcons name="qrcode" size={20} color="#fff" />
            <Text style={styles.qrText}>QR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.strip}>
          <TouchableOpacity
            style={styles.stripAction}
            activeOpacity={0.75}
            onPress={onPress}
            accessibilityRole="button"
          >
            <Ionicons name="person-outline" size={17} color="#fff" />
            <Text style={styles.stripText} numberOfLines={1}>
              Hồ sơ cá nhân
            </Text>
          </TouchableOpacity>
          <View style={styles.stripDivider} />
          <TouchableOpacity
            style={styles.stripAction}
            activeOpacity={0.75}
            onPress={onChangePasswordPress}
            accessibilityRole="button"
          >
            <Ionicons name="lock-closed-outline" size={17} color="#fff" />
            <Text style={styles.stripText} numberOfLines={1}>
              Đổi mật khẩu
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Thẻ đỏ giống nhau ở cả hai chế độ sáng / tối nên chỉ dùng màu thương hiệu.
// Các khối giãn trong hàng ngang ghi rõ flexGrow/flexShrink/flexBasis/minWidth:
// để `flex: 1` thì chữ giãn theo nội dung, đẩy nút QR ra ngoài thẻ.
const styles = StyleSheet.create({
  shadow: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: C.red,
    shadowColor: C.redDeep,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
  },
  decoRing: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 28,
    borderColor: "rgba(255,255,255,0.07)",
  },
  // `minHeight`: Cỡ chữ app to lên thì hàng tự cao thêm thay vì cắt chữ.
  topRow: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 10,
  },
  identity: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pressed: {
    opacity: 0.75,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  initials: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  identityText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  name: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  title: {
    flexShrink: 1,
    fontSize: 13.5,
    color: "rgba(255,255,255,0.88)",
  },
  qrPill: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  qrText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Cột nhãn rộng bằng ảnh đại diện, cách cột giá trị bằng khoảng ảnh–tên:
  // Mã NV / Bộ phận thẳng hàng với tên và chức danh phía trên.
  infoBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    gap: 10,
  },
  infoRows: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  infoRow: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    gap: 12,
  },
  infoLabel: {
    width: 56,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  infoCode: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  strip: {
    height: 48,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  stripAction: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  stripDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  stripText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
});
