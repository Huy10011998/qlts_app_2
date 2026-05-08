import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";
import IsLoading from "../../components/ui/IconLoading";
import { API_ENDPOINTS } from "../../config/Index";
import { User } from "../../types/Index";
import { callApi } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";
const { width: W } = Dimensions.get("window");

// ─── Info row ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  isLast?: boolean;
}> = ({ iconName, iconBg, iconColor, label, value, isLast }) => (
  <View style={[rowS.wrap, isLast && rowS.last]}>
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

const rowS = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDF0F5",
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
    color: "#8A95A3",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: { fontSize: 13.5, color: "#0F1923", fontWeight: "500" },
});

// ─── Section card ─────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={secS.group}>
    <View style={secS.titleRow}>
      <View style={secS.pill} />
      <Text style={secS.title}>{title}</Text>
    </View>
    <View style={secS.card}>{children}</View>
  </View>
);

const secS = StyleSheet.create({
  group: { marginHorizontal: 16, marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  pill: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: BRAND_RED,
    marginRight: 8,
  },
  title: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const ProfileScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { isMounted, showAlertIfActive } = useSafeAlert();
  const loadingRef = useRef(false);

  const fetchUserInfo = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isMounted()) setIsLoading(true);
    try {
      const res = await callApi<{ success: boolean; data: User }>(
        "POST",
        API_ENDPOINTS.GET_INFO,
        {},
      );
      if (isMounted()) setUser(res.data);
    } catch (e) {
      error("API error:", e);
      showAlertIfActive("Lỗi", "Không thể tải hồ sơ cá nhân.");
    } finally {
      loadingRef.current = false;
      if (isMounted()) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  if (isLoading || !user) return <IsLoading size="large" color={BRAND_RED} />;

  const initials = user.moTa
    ? user.moTa
        .split(" ")
        .slice(-2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero: nền đỏ liền với navigation header, có avatar + tên + wave ── */}
      <View style={s.hero}>
        <View style={s.blob1} />
        <View style={s.blob2} />

        {/* Wave chuyển tiếp đỏ → xám, paddingBottom = 0 để wave sát đáy */}
        <Svg
          width={W}
          height={32}
          viewBox={`0 0 ${W} 32`}
          style={{ marginTop: 16 }}
        >
          <Path
            d={`M0,6 C${W * 0.25},28 ${W * 0.5},0 ${W * 0.75},20 C${
              W * 0.88
            },30 ${W},8 ${W},32 L${W},32 L0,32 Z`}
            fill={BG}
          />
        </Svg>
      </View>

      <View style={{ height: 12 }} />

      <Section title="THÔNG TIN CƠ BẢN">
        <InfoRow
          iconName="person-outline"
          iconBg="#EEF2FF"
          iconColor="#3B5BDB"
          label="Họ và tên"
          value={user.moTa}
        />
        <InfoRow
          iconName="mail-outline"
          iconBg="#FFF0F6"
          iconColor="#E64980"
          label="Email"
          value={user.email}
          isLast
        />
      </Section>

      <Section title="ĐƠN VỊ CÔNG TÁC">
        <InfoRow
          iconName="business-outline"
          iconBg="#FFF5F5"
          iconColor={BRAND_RED}
          label="Đơn vị"
          value={user.donVi}
        />
        <InfoRow
          iconName="layers-outline"
          iconBg="#F3F0FF"
          iconColor="#7048E8"
          label="Phòng ban"
          value={user.phongBan}
        />
        <InfoRow
          iconName="git-branch-outline"
          iconBg="#F0FBF7"
          iconColor="#10B981"
          label="Bộ phận"
          value={user.boPhan}
        />
        <InfoRow
          iconName="people-outline"
          iconBg="#FFF8F0"
          iconColor="#E67700"
          label="Tổ nhóm"
          value={user.toNhom}
          isLast
        />
      </Section>

      <Section title="CHỨC VỤ & DANH HIỆU">
        <InfoRow
          iconName="briefcase-outline"
          iconBg="#F0F4FF"
          iconColor="#3B5BDB"
          label="Chức vụ"
          value={user.chucVu}
        />
        <InfoRow
          iconName="ribbon-outline"
          iconBg="#FFF0F6"
          iconColor="#E64980"
          label="Chức danh"
          value={user.chucDanh}
          isLast
        />
      </Section>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 40 },

  hero: {
    backgroundColor: BRAND_RED,
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 0, // wave tự fill, không cần padding dưới
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -50,
    right: -40,
  },
  blob2: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(0,0,0,0.06)",
    bottom: 10,
    left: -20,
  },
});

export default ProfileScreen;
