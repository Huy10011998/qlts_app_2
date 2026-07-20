import React, { useCallback, useState, useEffect, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../../components/ui/IconLoading";
import EmptyState from "../../components/ui/EmptyState";
import { API_ENDPOINTS } from "../../config/index";
import type { User } from "../../types/index";
import { callApi } from "../../services/data/callApi";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import {
  C,
  useHairlineBorderColor,
  useSeparatorColor,
} from "../../utils/helpers/colors";

const InfoRow: React.FC<{
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  isLast?: boolean;
}> = ({ iconName, iconBg, iconColor, label, value, isLast }) => {
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

const rowS = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
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
    color: C.textSub,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: { fontSize: 13.5, color: C.text, fontWeight: "500" },
});

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View style={secS.group}>
      <View style={secS.titleRow}>
        <View style={secS.pill} />
        <Text style={secS.title}>{title}</Text>
      </View>
      <View style={[secS.card, { borderColor: hairlineBorderColor }]}>{children}</View>
    </View>
  );
};

const secS = StyleSheet.create({
  group: { marginHorizontal: 16, marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  pill: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.red,
    marginRight: 8,
  },
  title: {
    fontSize: 11.5,
    fontWeight: "700",
    color: C.textSecondary,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: C.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
});

const ProfileScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const { isMounted } = useSafeAlert();
  const loadingRef = useRef(false);

  const fetchUserInfo = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isMounted()) setIsLoading(true);
    try {
      const res = await callApi<{ success: boolean; data: User }>(
        "POST",
        API_ENDPOINTS.GET_INFO,
        {},
      );
      if (isMounted()) {
        setUser(res.data);
        setHasLoadedOnce(true);
        setLoadErrorMessage(null);
      }
    } catch (e) {
      error("API error:", e);
      if (isMounted()) {
        setUser(null);
        setHasLoadedOnce(true);
        setLoadErrorMessage(
          "Vui lòng kiểm tra kết nối mạng hoặc mở lại màn hình này.",
        );
      }
    } finally {
      loadingRef.current = false;
      if (isMounted()) setIsLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  useNetworkAwareReload(() => {
    fetchUserInfo();
  }, {
    enabled: isFocused,
    hasError: Boolean(loadErrorMessage),
    onOffline: () => {
      setUser(null);
      setHasLoadedOnce(true);
      setLoadErrorMessage(
        "Vui lòng kiểm tra kết nối mạng hoặc mở lại màn hình này.",
      );
    },
  });

  if (isLoading || (!user && !hasLoadedOnce)) {
    return <IsLoading size="large" color={C.red} />;
  }

  if (!user || loadErrorMessage) {
    return (
      <View style={s.emptyStateRoot}>
        <EmptyState
          iconName={loadErrorMessage ? "cloud-offline-outline" : "person-circle-outline"}
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
          iconBg={C.indigoSurface}
          iconColor="#3B5BDB"
          label="Họ và tên"
          value={user.moTa}
        />
        <InfoRow
          iconName="mail-outline"
          iconBg={C.pinkSurface}
          iconColor="#E64980"
          label="Email"
          value={user.email}
          isLast
        />
      </Section>

      <Section title="ĐƠN VỊ CÔNG TÁC">
        <InfoRow
          iconName="business-outline"
          iconBg={C.redSurface}
          iconColor={C.red}
          label="Đơn vị"
          value={user.donVi}
        />
        <InfoRow
          iconName="layers-outline"
          iconBg={C.violetSurface}
          iconColor="#7048E8"
          label="Phòng ban"
          value={user.phongBan}
        />
        <InfoRow
          iconName="git-branch-outline"
          iconBg={C.greenLight}
          iconColor="#10B981"
          label="Bộ phận"
          value={user.boPhan}
        />
        <InfoRow
          iconName="people-outline"
          iconBg={C.orangeSurface}
          iconColor="#E67700"
          label="Tổ nhóm"
          value={user.toNhom}
          isLast
        />
      </Section>

      <Section title="CHỨC VỤ & DANH HIỆU">
        <InfoRow
          iconName="briefcase-outline"
          iconBg={C.blueSurface}
          iconColor="#3B5BDB"
          label="Chức vụ"
          value={user.chucVu}
        />
        <InfoRow
          iconName="ribbon-outline"
          iconBg={C.pinkSurface}
          iconColor="#E64980"
          label="Chức danh"
          value={user.chucDanh}
          isLast
        />
      </Section>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 16 },
  emptyStateRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: { paddingBottom: 40 },
});

export default ProfileScreen;
