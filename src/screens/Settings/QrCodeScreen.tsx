import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "../../components/ui/EmptyState";
import { useNhanVienInfo } from "../../hooks/useNhanVienInfo";
import {
  AppColors,
  C,
  useAppColors,
  useStyles,
} from "../../utils/helpers/colors";
import QrCodeBackButton from "./shared/QrCodeBackButton";
import QrCodeScreenSkeleton from "./shared/QrCodeScreenSkeleton";

/** Thông tin công ty ở chân card — cố định trong code, không API nào trả về. */
const COMPANY_NAME = "CHOLIMEX FOODS JOINT STOCK COMPANY";
const COMPANY_ADDRESS =
  "Đường số 7, Khu công nghiệp Vĩnh Lộc, P. Bình Chánh, Thành phố Hồ Chí Minh, Việt Nam";
const COMPANY_WEBSITE = "https://cholimexfood.com.vn/";
const COMPANY_WEBSITE_LABEL = "www.cholimexfood.com.vn";

/** Đỏ mận của card visit in — đậm hơn đỏ thương hiệu `C.red` khá nhiều. */
const CARD_BG_TOP = "#8C2634";
const CARD_BG_BOTTOM = "#6E1A26";

/** Cỡ mã QR — cố định 128 như bản web. */
const QR_SIZE = 128;

/**
 * "0834601321" -> "0834 601 321": bốn số đầu rồi tách nhóm ba, đúng kiểu số in
 * trên card giấy. BE trả số thô, không định dạng sẵn.
 */
const formatPhoneNumber = (phoneNumber?: string | null) => {
  const digits = (phoneNumber ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return digits;

  const parts = [digits.slice(0, 4)];
  for (let i = 4; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join(" ");
};

const QrCodeScreen: React.FC = () => {
  const s = useStyles(makeS);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  /* Dữ liệu đã nạp sẵn lúc đăng nhập — mở màn không gọi API nữa. */
  const { info: nhanVien, isLoading, errorMessage } = useNhanVienInfo();

  if (isLoading) {
    return <QrCodeScreenSkeleton />;
  }

  if (!nhanVien || errorMessage) {
    return (
      <View style={s.emptyStateRoot}>
        {/* Nền sáng: phải có đĩa `surface` phía sau, không thì mũi tên chìm
            hẳn vào nền màn lỗi. */}
        <QrCodeBackButton tint={c.text} backgroundColor={c.surface} />
        <EmptyState
          iconName={errorMessage ? "cloud-offline-outline" : "qr-code-outline"}
          title={
            errorMessage
              ? "Không thể tải thông tin QrCode"
              : "Không có thông tin QrCode"
          }
          subtitle={
            errorMessage ||
            "Không thể tải dữ liệu danh thiếp của tài khoản hiện tại."
          }
        />
      </View>
    );
  }

  const fullName = nhanVien.ten?.trim() || nhanVien.ten_Eng?.trim() || "";
  /* BE dặn rõ: dòng in lên danh thiếp là `chucVu` (chữ tự do), không phải
     `chucDanh` hay `chucVuCoCau` lấy từ danh mục. */
  const jobTitle = nhanVien.chucVu?.trim() || "";
  const email = nhanVien.email?.trim() || "";
  const phone = formatPhoneNumber(nhanVien.soDienThoai);
  const phoneLink = (nhanVien.soDienThoai ?? "").replace(/\s/g, "");
  /* Mã QR mang thẳng link danh thiếp công khai của BE: quét là mở trang web,
     ở đó đã có sẵn nút tải vCard và đổi Việt/Anh.
     `qrUrl` null là chưa có danh thiếp công khai (tài khoản chưa gán nhân
     viên, hoặc nhân viên cũ chưa có GUID) — lúc đó ẩn hẳn mã QR. */
  const profileUrl = nhanVien.qrUrl?.trim() || "";

  return (
    /* Dựng theo mặt sau card visit giấy: nền đỏ mận, ba khối trên/giữa/dưới. */
    <LinearGradient
      colors={[CARD_BG_TOP, CARD_BG_BOTTOM]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.root}
    >
      <QrCodeBackButton tint={C.onBrand} backgroundColor="#FFFFFF24" />

      <View
        style={[
          s.content,
          { paddingTop: insets.top + 18, paddingBottom: 26 + insets.bottom },
        ]}
      >
        {/* Mã QR ở góc trái trên, đúng vị trí trên card in. Không có danh
            thiếp công khai thì chừa một khoảng trống cùng chiều cao, để ba
            khối của card không dồn lên nhau. */}
        {profileUrl ? (
          <View style={s.qrPanel}>
            <QRCode
              value={profileUrl}
              size={QR_SIZE}
              color="#0F1923"
              backgroundColor="#FFFFFF"
              ecl="M"
            />
          </View>
        ) : (
          <View style={s.qrSpacer} />
        )}

        <View style={s.personBlock}>
          <Text style={s.fullName} numberOfLines={2} adjustsFontSizeToFit>
            {fullName || "---"}
          </Text>
          {jobTitle ? (
            <Text style={s.position} numberOfLines={2}>
              {jobTitle}
            </Text>
          ) : null}

          {phone ? (
            <Pressable
              accessibilityLabel={`Gọi ${phone}`}
              accessibilityRole="button"
              onPress={() => Linking.openURL(`tel:${phoneLink}`)}
              style={({ pressed }) => [s.phoneRow, pressed && s.pressed]}
            >
              <View style={s.phoneIconRing}>
                <Ionicons name="call" size={12} color={C.onBrand} />
              </View>
              <Text style={s.phone}>{phone}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.footer}>
          <Text style={s.companyName}>{COMPANY_NAME}</Text>

          <View style={s.footerRow}>
            <Ionicons name="location" size={15} color={C.onBrand} />
            <Text style={s.footerText}>{COMPANY_ADDRESS}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!email}
            onPress={() => Linking.openURL(`mailto:${email}`)}
            style={({ pressed }) => [s.footerRow, pressed && s.pressed]}
          >
            <Ionicons name="mail" size={15} color={C.onBrand} />
            <Text style={s.footerText}>Email: {email || "---"}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(COMPANY_WEBSITE)}
            style={({ pressed }) => [s.footerRow, pressed && s.pressed]}
          >
            <Ionicons name="globe" size={15} color={C.onBrand} />
            <Text style={s.footerText}>Website: {COMPANY_WEBSITE_LABEL}</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

const makeS = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    emptyStateRoot: { flex: 1, backgroundColor: c.bg },

    /* Card in chia ba khối: QR trên cùng, tên/điện thoại ở giữa, công ty ở đáy. */
    content: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: 22,
    },

    qrPanel: {
      alignSelf: "flex-start",
      backgroundColor: "#FFFFFF",
      borderRadius: 6,
      padding: 6,
    },
    qrSpacer: { height: QR_SIZE + 12 },

    personBlock: { alignItems: "center", paddingHorizontal: 4 },
    fullName: {
      fontSize: 27,
      lineHeight: 33,
      fontWeight: "900",
      letterSpacing: 0.6,
      color: C.onBrand,
      textAlign: "center",
      textTransform: "uppercase",
    },
    position: {
      marginTop: 7,
      fontSize: 14.5,
      lineHeight: 20,
      fontWeight: "600",
      color: "#F6E3E5",
      textAlign: "center",
    },
    phoneRow: {
      marginTop: 22,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    /* Vòng tròn viền mảnh quanh icon điện thoại, giống hệt card in. */
    phoneIconRing: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.2,
      borderColor: C.onBrand,
      alignItems: "center",
      justifyContent: "center",
    },
    phone: {
      fontSize: 23,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: C.onBrand,
    },

    footer: { width: "100%" },
    companyName: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "900",
      letterSpacing: 0.2,
      color: C.onBrand,
    },
    footerRow: {
      marginTop: 7,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    footerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: "#F3DCDF",
      /* Icon canh với dòng chữ đầu tiên, không trôi lên trên. */
      marginTop: -1,
    },
    pressed: { opacity: 0.6 },
  });

export default QrCodeScreen;
