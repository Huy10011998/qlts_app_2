import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ProfileScreenSkeleton from "./ProfileScreenSkeleton";
import EmptyState from "../../components/ui/EmptyState";
import { useNhanVienInfo } from "../../hooks/useNhanVienInfo";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useSeparatorColor,
  useStyles,
} from "../../utils/helpers/colors";

const InfoRow: React.FC<{
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  isLast?: boolean;
}> = ({ iconName, iconBg, iconColor, label, value, isLast }) => {
  const rowS = useStyles(makeRowS);
  const separatorColor = useSeparatorColor();

  return (
    <View
      style={[
        rowS.wrap,
        { borderBottomColor: separatorColor },
        isLast && rowS.last,
      ]}
    >
      <View style={[rowS.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>
      <View style={rowS.col}>
        <Text style={rowS.label}>{label}</Text>
        <Text style={rowS.value} numberOfLines={2}>
          {value && value.trim() ? value : "---"}
        </Text>
      </View>
    </View>
  );
};

const makeRowS = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 12,
    },
    last: { borderBottomWidth: 0 },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    col: { flex: 1 },
    label: {
      fontSize: 10.5,
      color: c.textSub,
      fontWeight: "600",
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    value: { fontSize: 13.5, color: c.text, fontWeight: "500" },
  });

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const secS = useStyles(makeSecS);
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View style={secS.group}>
      <View style={secS.titleRow}>
        <View style={secS.pill} />
        <Text style={secS.title}>{title}</Text>
      </View>
      <View style={[secS.card, { borderColor: hairlineBorderColor }]}>
        {children}
      </View>
    </View>
  );
};

const makeSecS = (c: AppColors) =>
  StyleSheet.create({
    group: { marginHorizontal: 16, marginBottom: 16 },
    titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    pill: {
      width: 4,
      height: 14,
      borderRadius: 2,
      backgroundColor: c.red,
      marginRight: 8,
    },
    title: {
      fontSize: 11.5,
      fontWeight: "700",
      color: c.textSecondary,
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: c.shadow,
      shadowOpacity: 0.07,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
  });

const ProfileScreen: React.FC = () => {
  const s = useStyles(makeS);
  const c = useAppColors();
  /* Cùng nguồn với màn Thông tin QrCode: danh thiếp nạp một lần lúc đăng nhập,
     mở màn không gọi lại API. */
  const { info: user, isLoading, errorMessage: loadErrorMessage } =
    useNhanVienInfo();

  if (isLoading) {
    return <ProfileScreenSkeleton />;
  }

  if (!user || loadErrorMessage) {
    return (
      <View style={s.emptyStateRoot}>
        <EmptyState
          iconName={
            loadErrorMessage ? "cloud-offline-outline" : "person-circle-outline"
          }
          title={
            loadErrorMessage
              ? "Không thể tải hồ sơ cá nhân"
              : "Không có hồ sơ cá nhân"
          }
          subtitle={
            loadErrorMessage ||
            "Không thể tải dữ liệu hồ sơ của tài khoản hiện tại."
          }
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Section title="THÔNG TIN CƠ BẢN">
        <InfoRow
          iconName="person-outline"
          iconBg={c.indigoSurface}
          iconColor="#3B5BDB"
          label="Họ và tên"
          value={user.ten}
        />
        <InfoRow
          iconName="card-outline"
          iconBg={c.slateLight}
          iconColor={c.slate}
          label="Mã nhân viên"
          value={user.ma ?? undefined}
        />
        <InfoRow
          iconName="call-outline"
          iconBg={c.greenLight}
          iconColor={c.emerald}
          label="Điện thoại"
          value={user.soDienThoai ?? undefined}
        />
        <InfoRow
          iconName="mail-outline"
          iconBg={c.pinkSurface}
          iconColor="#E64980"
          label="Email"
          value={user.email ?? undefined}
          isLast
        />
      </Section>

      <Section title="ĐƠN VỊ CÔNG TÁC">
        <InfoRow
          iconName="layers-outline"
          iconBg={c.violetSurface}
          iconColor="#7048E8"
          label="Phòng ban"
          value={user.phongBan ?? undefined}
        />
        <InfoRow
          iconName="git-branch-outline"
          iconBg={c.blueSurface}
          iconColor="#3B5BDB"
          label="Bộ phận"
          value={user.boPhan ?? undefined}
        />
        <InfoRow
          iconName="people-outline"
          iconBg={c.orangeSurface}
          iconColor="#E67700"
          label="Tổ đội"
          value={user.toDoi ?? undefined}
          isLast
        />
      </Section>

      <Section title="CHỨC VỤ & DANH HIỆU">
        <InfoRow
          iconName="albums-outline"
          iconBg={c.tealSurface}
          iconColor={c.green}
          label="Chức vụ cơ cấu"
          value={user.chucVuCoCau ?? undefined}
        />
        <InfoRow
          iconName="ribbon-outline"
          iconBg={c.pinkSurface}
          iconColor="#E64980"
          label="Chức danh"
          value={user.chucDanh ?? undefined}
          isLast
        />
      </Section>
    </ScrollView>
  );
};

const makeS = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, paddingTop: 16 },
    emptyStateRoot: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: { paddingBottom: 40 },
  });

export default ProfileScreen;
