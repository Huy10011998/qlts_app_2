import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { StackNavigation } from "../../types";
import { C, useAppColors } from "../../utils/helpers/colors";
import TabBarSpacer from "../../navigation/shared/TabBarSpacer";
import { useHideTabBarOnScroll } from "../../navigation/shared/tabBarAutoHide";
import SettingProfileCard from "./shared/SettingProfileCard";
import SettingPhotoHeader from "./shared/SettingPhotoHeader";
import SettingScreenSkeleton from "./shared/SettingScreenSkeleton";
import ChangePasswordModal from "./shared/ChangePasswordModal";
import { useChangePasswordFlow } from "./shared/useChangePasswordFlow";
import SettingSectionGroup from "./shared/SettingSectionGroup";
import { SettingRowItem } from "./shared/SettingRowItem";
import SettingLogoutRow from "./shared/SettingLogoutRow";
import { SETTING_GROUPS, SettingGroupId } from "./shared/settingGroups";
import { useStoreVersionCheck } from "./shared/useStoreVersionCheck";
import { useNhanVienInfo } from "../../hooks/useNhanVienInfo";
import { usePermission } from "../../hooks/usePermission";

// ─── Main Screen ──────────────────────────────────────────────────────────────
/**
 * Màn Cài đặt chỉ còn danh sách nhóm; từng dòng cài đặt nằm trong màn của nhóm
 * đó (`SettingGroupScreen`), riêng Đăng xuất để ngay cuối màn. Dòng phụ dưới tên nhóm tóm tắt bên trong có gì —
 * riêng Thông tin ứng dụng báo luôn trạng thái phiên bản để thấy có bản mới mà
 * không phải mở vào.
 */
const SettingScreen = () => {
  const colors = useAppColors();
  const navigation = useNavigation<StackNavigation<"Settings">>();
  // Thanh tab tự ẩn khi đọc xuống, hiện lại khi vuốt ngược lên (như Trang chủ).
  const hideTabBarOnScroll = useHideTabBarOnScroll();
  const { can } = usePermission();
  const canUseCameraNoti = can("Camera", "NotiCameraMobile");
  const { installedVersionLabel, hasNewVersion, resultLabel } =
    useStoreVersionCheck();
  /* Danh thiếp nạp sẵn lúc đăng nhập — nguồn của tên + ảnh trên đầu màn. */
  const {
    info: nhanVien,
    isLoading: isLoadingNhanVien,
    errorMessage: nhanVienErrorMessage,
    reload: reloadNhanVien,
  } = useNhanVienInfo();
  /* Trang đã hiện lần nào chưa. Sau đó nạp lại danh thiếp (bấm "Thử lại",
     có mạng lại, quay lại màn) chỉ quay vòng trên nút — không thì cả màn nháy
     về khung chờ rồi mới hiện lại. */
  const [hasShownContent, setHasShownContent] = useState(false);

  const shouldShowSkeleton = isLoadingNhanVien && !hasShownContent;
  const { openChangePassword, changePasswordModalProps } =
    useChangePasswordFlow();

  useEffect(() => {
    if (!shouldShowSkeleton) setHasShownContent(true);
  }, [shouldShowSkeleton]);

  const groupSublabels: Record<SettingGroupId, string> = {
    account:
      Platform.OS === "ios"
        ? "Hồ sơ, danh thiếp QR, mật khẩu, FaceID"
        : "Hồ sơ, danh thiếp QR, mật khẩu, vân tay",
    support: "Hướng dẫn sử dụng, câu hỏi thường gặp",
    system: [
      Platform.OS === "ios" ? "Quyền mạng, camera" : "Quyền camera",
      "vị trí",
      "thông báo",
      ...(canUseCameraNoti ? ["thông báo camera"] : []),
    ].join(", "),
    appInfo: resultLabel
      ? `${installedVersionLabel} • ${resultLabel}`
      : installedVersionLabel,
    other: "Hiển thị, cỡ chữ",
  };

  /* Lỗi tải KHÔNG được chiếm cả màn: vẫn dựng đủ danh sách (phần lớn là cài
     đặt cục bộ, dùng được khi mất mạng) và báo lỗi gọn trong một thẻ có nút
     "Thử lại". */
  const inlineErrorMessage = nhanVien
    ? null
    : nhanVienErrorMessage || "Không thể tải dữ liệu tài khoản hiện tại.";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={hideTabBarOnScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Ảnh nhà máy thay header của navigator (kiểu VCB), hiện cả lúc chờ. */}
        <SettingPhotoHeader />
        {shouldShowSkeleton ? (
          <SettingScreenSkeleton />
        ) : (
          <>
            {/* Chưa có danh thiếp thì thẻ tự hiện tên "---" và chữ "?". */}
            <SettingProfileCard
              name={nhanVien?.ten}
              title={nhanVien?.chucDanh?.trim() || undefined}
              code={nhanVien?.ma?.trim() || undefined}
              unit={
                nhanVien?.boPhan?.trim() || nhanVien?.phongBan?.trim() || undefined
              }
              avatarUrl={nhanVien?.hinhAnh ?? undefined}
              onPress={() => navigation.navigate("Profile")}
              onQrPress={() => navigation.navigate("QrCode")}
              onChangePasswordPress={openChangePassword}
            />

          <View style={[styles.greyZone, { backgroundColor: colors.bg }]}>
            {inlineErrorMessage ? (
              <View
                style={[
                  styles.inlineError,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.redBorder,
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.inlineErrorIcon,
                    { backgroundColor: colors.redSurface },
                  ]}
                >
                  <Ionicons
                    name="cloud-offline-outline"
                    size={18}
                    color={C.red}
                  />
                </View>
                <View style={styles.inlineErrorContent}>
                  <Text style={[styles.inlineErrorTitle, { color: colors.text }]}>
                    Không thể tải dữ liệu tài khoản
                  </Text>
                  <Text
                    style={[styles.inlineErrorText, { color: colors.textSub }]}
                  >
                    {inlineErrorMessage}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.inlineErrorButton,
                    {
                      backgroundColor: colors.redSurface,
                      borderColor: colors.redBorder,
                    },
                  ]}
                  onPress={reloadNhanVien}
                  disabled={isLoadingNhanVien}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Thử lại"
                >
                  {isLoadingNhanVien ? (
                    <ActivityIndicator size="small" color={C.red} />
                  ) : (
                    <Text style={styles.inlineErrorButtonText}>Thử lại</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            <SettingSectionGroup accent={C.red}>
              {SETTING_GROUPS.map((group, index) => (
                <SettingRowItem
                  key={group.id}
                  iconName={group.iconName}
                  iconBg={group.iconBg}
                  label={group.title}
                  sublabel={groupSublabels[group.id]}
                  badge={group.id === "appInfo" && hasNewVersion ? "Mới" : undefined}
                  isLast={index === SETTING_GROUPS.length - 1}
                  onPress={() =>
                    navigation.navigate("SettingGroup", { group: group.id })
                  }
                />
              ))}
            </SettingSectionGroup>

            {/* Đăng xuất để riêng ngoài màn chính cho bấm nhanh, không gom vào nhóm. */}
            <SettingSectionGroup accent={C.rose}>
              <SettingLogoutRow />
            </SettingSectionGroup>

            <Text style={[styles.footer, { color: colors.textMuted }]}>
              Cholimex Food · {installedVersionLabel}
            </Text>
            <TabBarSpacer />
          </View>
          </>
        )}
      </ScrollView>
      <ChangePasswordModal {...changePasswordModalProps} />
    </View>
  );
};

// ─── Global Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  greyZone: { flexGrow: 1, paddingBottom: 24 },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 20,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inlineErrorIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inlineErrorContent: {
    flex: 1,
    paddingRight: 10,
  },
  inlineErrorTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  inlineErrorText: {
    fontSize: 12,
    marginTop: 2,
  },
  inlineErrorButton: {
    minWidth: 76,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  inlineErrorButtonText: {
    color: C.red,
    fontSize: 12.5,
    fontWeight: "700",
  },
});

export default SettingScreen;
