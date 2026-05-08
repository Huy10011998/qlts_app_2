import React, { useMemo } from "react";
import {
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  HomeNavigationProp,
  MenuItemCardProps,
  MenuItemComponent,
} from "../../types";
import { useViewPermission } from "../../hooks/useViewPermission";
import { useAppDispatch } from "../../store/Hooks";
import { reloadPermissions } from "../../store/PermissionActions";

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Color palette per menu item ──────────────────────────────────────────────
const CARD_THEME: Record<
  string,
  { bg: string; iconBg: string; color: string; accent: string }
> = {
  TaiSan: {
    bg: "#FFF5F5",
    iconBg: "#FFE4E4",
    color: BRAND_RED,
    accent: "#FF6B6B",
  },
  Camera: {
    bg: "#F0F4FF",
    iconBg: "#D9E4FF",
    color: "#3B5BDB",
    accent: "#748FFC",
  },
  DHCD: {
    bg: "#F3F0FF",
    iconBg: "#E5DEFF",
    color: "#7048E8",
    accent: "#9775FA",
  },
  default: {
    bg: "#FFF8F0",
    iconBg: "#FFE8CC",
    color: "#E67700",
    accent: "#FFA94D",
  },
};

// ─── Menu Item Card ───────────────────────────────────────────────────────────
interface MenuItemCardPropsExtended extends MenuItemCardProps {
  viewPermission?: string;
  description?: string;
}

const MenuItemCard: React.FC<MenuItemCardPropsExtended> = ({
  iconName,
  label,
  description,
  notificationCount,
  index,
  onPress,
  viewPermission,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 80,
      tension: 55,
      friction: 7,
    }).start();
  }, [index, scaleAnim]);

  const theme = CARD_THEME[viewPermission ?? "default"] ?? CARD_THEME.default;

  return (
    <AnimatedTouchable
      style={[{ flex: 1, transform: [{ scale: scaleAnim }] }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={[cardStyles.card, { backgroundColor: theme.bg }]}>
        {/* Top accent bar */}
        <View
          style={[cardStyles.accentBar, { backgroundColor: theme.color }]}
        />

        {/* Icon */}
        <View style={[cardStyles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconName} color={theme.color} size={22} />
          {notificationCount ? (
            <View style={cardStyles.badge}>
              <Text style={cardStyles.badgeText}>{notificationCount}</Text>
            </View>
          ) : null}
        </View>

        {/* Label */}
        <Text
          style={[cardStyles.label, { color: theme.color }]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {/* Arrow chip */}
        <View style={[cardStyles.arrowChip, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="arrow-forward" size={10} color={theme.color} />
        </View>
      </View>
    </AnimatedTouchable>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accentBar: {
    height: 3,
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: BRAND_RED,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "white",
  },
  badgeText: { color: "white", fontSize: 9, fontWeight: "700" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 8,
  },
  arrowChip: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Event Banner ─────────────────────────────────────────────────────────────
const EventBanner: React.FC<{
  title: string;
  date: string;
  time: string;
  venue: string;
  count: number;
  onPress?: () => void;
}> = ({ title, date, time, venue, count, onPress }) => (
  <TouchableOpacity
    style={bannerStyles.card}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {/* Red left stripe */}
    <View style={bannerStyles.stripe} />

    <View style={bannerStyles.content}>
      {/* Date pill (top right) */}
      <View style={bannerStyles.datePill}>
        <Text style={bannerStyles.dateDay}>{date.split("/")[0]}</Text>
        <Text style={bannerStyles.dateMon}>Th{date.split("/")[1]}</Text>
      </View>

      {/* Text block */}
      <View style={bannerStyles.textBlock}>
        <View style={bannerStyles.tagRow}>
          <View style={bannerStyles.tag}>
            <Ionicons
              name="calendar"
              size={9}
              color={BRAND_RED}
              style={{ marginRight: 3 }}
            />
            <Text style={bannerStyles.tagText}>SỰ KIỆN SẮP TỚI</Text>
          </View>
        </View>
        <Text style={bannerStyles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={bannerStyles.metaRow}>
          <Ionicons name="location-outline" size={11} color="#8A95A3" />
          <Text style={bannerStyles.meta}>{venue}</Text>
          <View style={bannerStyles.dot} />
          <Ionicons name="time-outline" size={11} color="#8A95A3" />
          <Text style={bannerStyles.meta}>{time}</Text>
        </View>
        <View style={bannerStyles.countRow}>
          <Ionicons name="people-outline" size={12} color={BRAND_RED} />
          <Text style={bannerStyles.countText}>{count} cổ đông đăng ký</Text>
        </View>
      </View>
    </View>

    {/* Chevron */}
    <View style={bannerStyles.chevronWrap}>
      <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
    </View>
  </TouchableOpacity>
);

const bannerStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1A2340",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    paddingRight: 12,
  },
  stripe: {
    width: 5,
    alignSelf: "stretch",
    backgroundColor: BRAND_RED,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  datePill: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  dateDay: {
    fontSize: 20,
    fontWeight: "800",
    color: BRAND_RED,
    lineHeight: 24,
  },
  dateMon: { fontSize: 10, fontWeight: "600", color: BRAND_RED, opacity: 0.7 },
  textBlock: { flex: 1 },
  tagRow: { flexDirection: "row", marginBottom: 4 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "700",
    color: BRAND_RED,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1923",
    marginBottom: 5,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  meta: { fontSize: 10, color: "#8A95A3" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#D1D5DB" },
  countRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  countText: { fontSize: 11, fontWeight: "600", color: BRAND_RED },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#F0F2F8",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  value: string;
  label: string;
  sub?: string;
  subColor?: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
}> = ({
  value,
  label,
  sub,
  subColor = "#aaa",
  iconName,
  iconBg,
  iconColor,
  trend,
}) => (
  <View style={statStyles.card}>
    <View style={statStyles.top}>
      <View style={[statStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} color={iconColor} size={16} />
      </View>
      {trend === "up" && (
        <View style={[statStyles.trendBadge, { backgroundColor: "#E8FBF3" }]}>
          <Ionicons name="trending-up" size={10} color="#10B981" />
        </View>
      )}
      {trend === "down" && (
        <View style={[statStyles.trendBadge, { backgroundColor: "#FFF0F0" }]}>
          <Ionicons name="trending-down" size={10} color={BRAND_RED} />
        </View>
      )}
    </View>
    <Text style={[statStyles.value, { color: iconColor }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
    {sub ? (
      <Text style={[statStyles.sub, { color: subColor }]}>{sub}</Text>
    ) : null}
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  label: { fontSize: 10.5, color: "#6B7280", marginTop: 2, fontWeight: "500" },
  sub: { fontSize: 9.5, marginTop: 5, fontWeight: "500" },
});

// ─── Quick Action Row ─────────────────────────────────────────────────────────
const QuickAction: React.FC<{
  iconName: string;
  label: string;
  bg: string;
  color: string;
  onPress?: () => void;
}> = ({ iconName, label, bg, color, onPress }) => (
  <TouchableOpacity
    style={qaStyles.item}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[qaStyles.icon, { backgroundColor: bg }]}>
      <Ionicons name={iconName} size={17} color={color} />
    </View>
    <Text style={qaStyles.label}>{label}</Text>
  </TouchableOpacity>
);

const qaStyles = StyleSheet.create({
  item: { alignItems: "center", gap: 6 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
  },
});

// ─── Section Title ────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{
  label: string;
  action?: string;
  onAction?: () => void;
}> = ({ label, action, onAction }) => (
  <View style={secStyles.row}>
    <View style={secStyles.pill} />
    <Text style={secStyles.label}>{label}</Text>
    {action ? (
      <TouchableOpacity onPress={onAction}>
        <Text style={secStyles.action}>{action}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const secStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  pill: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: BRAND_RED,
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
  },
  action: { fontSize: 11, color: BRAND_RED, fontWeight: "600" },
});

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const dispatch = useAppDispatch();
  const { canView, loaded } = useViewPermission();

  useFocusEffect(
    React.useCallback(() => {
      dispatch(reloadPermissions());
    }, [dispatch]),
  );

  const meetingInfo = {
    meetingId: "meeting-2026",
    meetingTitle: "Đại hội cổ đông thường niên 2026",
    meetingDate: "05/05/2026",
    meetingTime: "08:30",
    meetingVenue: "Hội trường tầng 5",
    totalShareholders: 220,
  };

  const menuItems = useMemo<
    (MenuItemComponent & { viewPermission?: string; description?: string })[]
  >(
    () => [
      {
        id: "1",
        label: "Tài sản",
        iconName: "cube-outline",
        viewPermission: "TaiSan",
        description: "Quản lý tài sản",
        onPress: () => navigation.navigate("Asset"),
      },
      {
        id: "4",
        label: "Camera",
        iconName: "camera-outline",
        viewPermission: "Camera",
        description: "Giám sát hệ thống",
        onPress: () => navigation.navigate("Camera"),
      },
      {
        id: "5",
        label: "Đại hội cổ đông",
        iconName: "people-outline",
        viewPermission: "DHCD",
        description: "Quản lý cổ đông",
        onPress: () => navigation.navigate("ShareholdersMeeting", meetingInfo),
      },
    ],
    [navigation],
  );

  const visibleMenuItems = useMemo(() => {
    if (!loaded) return [];
    return menuItems.filter((item) =>
      item.viewPermission ? canView(item.viewPermission) : true,
    );
  }, [canView, loaded, menuItems]);

  if (!loaded) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={BRAND_RED} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Event Banner ── */}
        <SectionTitle label="SỰ KIỆN" action="Xem tất cả" />
        <EventBanner
          title={meetingInfo.meetingTitle}
          date={meetingInfo.meetingDate}
          time={meetingInfo.meetingTime}
          venue={meetingInfo.meetingVenue}
          count={meetingInfo.totalShareholders}
          onPress={() =>
            navigation.navigate("ShareholdersMeeting", meetingInfo)
          }
        />

        {/* ── Menu Grid ── */}
        <SectionTitle label="CHỨC NĂNG" />
        <View style={styles.grid}>
          {visibleMenuItems.map((item, index) => (
            <MenuItemCard key={item.id} {...item} index={index} />
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <SectionTitle label="THAO TÁC NHANH" />
        <View style={styles.qaCard}>
          <QuickAction
            iconName="qr-code-outline"
            label="Quét QR"
            bg="#F0F4FF"
            color="#3B5BDB"
          />
          <View style={styles.qaDivider} />
          <QuickAction
            iconName="document-text-outline"
            label="Báo cáo"
            bg="#F3F0FF"
            color="#7048E8"
          />
          <View style={styles.qaDivider} />
          <QuickAction
            iconName="notifications-outline"
            label="Thông báo"
            bg="#FFF5F5"
            color={BRAND_RED}
          />
          <View style={styles.qaDivider} />
          <QuickAction
            iconName="settings-outline"
            label="Cài đặt"
            bg="#F0FBF7"
            color="#10B981"
          />
        </View>

        {/* ── Stats ── */}
        <SectionTitle label="TỔNG QUAN" />
        <View style={styles.statsRow}>
          <StatCard
            value={String(meetingInfo.totalShareholders)}
            label="Cổ đông tham dự"
            sub="Cập nhật hôm nay"
            subColor="#10B981"
            iconName="people-circle-outline"
            iconBg="#E8FBF3"
            iconColor="#10B981"
            trend="up"
          />
          <StatCard
            value="1,284"
            label="Tài sản đang quản lý"
            sub="Cập nhật hôm nay"
            subColor="#8A95A3"
            iconName="cube-outline"
            iconBg="#FFF0F0"
            iconColor={BRAND_RED}
            trend="neutral"
          />
        </View>

        {/* ── Activity ── */}
        <SectionTitle label="HOẠT ĐỘNG GẦN ĐÂY" action="Tất cả" />
        <View style={styles.actCard}>
          {[
            {
              text: "Camera khu A phát hiện chuyển động",
              time: "14:22",
              dot: BRAND_RED,
            },
            {
              text: "Tài sản #TB-0041 được cập nhật",
              time: "11:05",
              dot: "#3B5BDB",
            },
            {
              text: "Xác nhận đăng ký cổ đông #245",
              time: "Hôm qua",
              dot: "#D1D5DB",
            },
          ].map((item, i, arr) => (
            <View
              key={i}
              style={[actStyles.row, i === arr.length - 1 && actStyles.rowLast]}
            >
              <View style={[actStyles.dot, { backgroundColor: item.dot }]} />
              <Text style={actStyles.text} numberOfLines={1}>
                {item.text}
              </Text>
              <Text style={actStyles.time}>{item.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const actStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDF0F5",
  },
  rowLast: { borderBottomWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  text: { flex: 1, fontSize: 11.5, color: "#374151", fontWeight: "400" },
  time: { fontSize: 10, color: "#9CA3AF" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingWrap: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  grid: {
    flexDirection: "row",
    flexWrap: "nowrap", // always 1 row
    gap: 10,
    marginBottom: 14,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },

  // Quick actions card
  qaCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  qaDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#EDF0F5",
  },

  // Activity
  actCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
    shadowColor: "#1A2340",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});

export default HomeScreen;
