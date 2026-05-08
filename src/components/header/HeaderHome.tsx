import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Text,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { StackNavigation } from "../../types/Navigator.d";
import { HeaderHomeProps } from "../../types/Components.d";
import { useNavigation } from "@react-navigation/native";

const BRAND_RED = "#E31E24";
const { width: W } = Dimensions.get("window");

// ─── helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Chào buổi sáng", icon: "sunny-outline" };
  if (h < 18) return { text: "Chào buổi chiều", icon: "partly-sunny-outline" };
  return { text: "Chào buổi tối", icon: "moon-outline" };
};

const formatTime = (d: Date) =>
  d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const formatDate = (d: Date) =>
  d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ─── Decorative wave at bottom of header ─────────────────────────────────────
const HeaderWave: React.FC = () => (
  <Svg
    width={W}
    height={36}
    viewBox={`0 0 ${W} 36`}
    style={{ position: "absolute", bottom: 0 }}
  >
    {/* two-layer wave for depth */}
    <Path
      d={`M0,8 C${W * 0.2},32 ${W * 0.4},0 ${W * 0.6},18 C${W * 0.8},36 ${
        W * 0.9
      },10 ${W},22 L${W},36 L0,36 Z`}
      fill="rgba(255,255,255,0.12)"
    />
    <Path
      d={`M0,18 C${W * 0.25},36 ${W * 0.5},10 ${W * 0.75},28 C${
        W * 0.88
      },38 ${W},16 ${W},36 L${W},36 L0,36 Z`}
      fill="#F0F2F8"
    />
  </Svg>
);

// ─── HeaderHome ───────────────────────────────────────────────────────────────
export default function HeaderHome({}: HeaderHomeProps) {
  const navigation = useNavigation<StackNavigation<"Tabs">>();
  const insets = useSafeAreaInsets();
  const greeting = getGreeting();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    // Outer container: red background so wave blends seamlessly
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      {/* Decorative circles for depth */}
      <View style={styles.deco1} />
      <View style={styles.deco2} />
      <View style={styles.deco3} />

      {/* ── Top bar: logo + notification bell ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://cholimexfood.com.vn")}
          activeOpacity={0.8}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/logo-cholimex-trans.jpg")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {/* red dot badge */}
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Tabs")}
          >
            <Ionicons name="search-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Greeting block ── */}
      <View style={styles.greetRow}>
        <View style={styles.greetLeft}>
          <View style={styles.greetIconWrap}>
            <Ionicons
              name={greeting.icon as any}
              size={14}
              color="rgba(255,255,255,0.85)"
            />
          </View>
          <Text style={styles.greetText}>{greeting.text}</Text>
        </View>
        <View style={styles.timePill}>
          <Ionicons
            name="time-outline"
            size={11}
            color="rgba(255,255,255,0.7)"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.timeText}>{formatTime(now)}</Text>
        </View>
      </View>

      {/* ── Date chip ── */}
      <Text style={styles.dateText}>{formatDate(now)}</Text>

      {/* spacer before wave */}
      <View style={{ height: 36 }}>
        <HeaderWave />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outer: {
    backgroundColor: BRAND_RED,
    overflow: "hidden",
  },
  // decorative blobs
  deco1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -50,
    right: -40,
  },
  deco2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 30,
    right: 60,
  },
  deco3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.06)",
    bottom: 20,
    left: -20,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  logoWrap: {
    backgroundColor: "#fff",
    borderRadius: 50, // oval — follows the rounded logo shape
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: "hidden",
  },
  logo: { width: 90, height: 34 },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  notifDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFD60A",
    borderWidth: 1.5,
    borderColor: BRAND_RED,
  },

  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 3,
  },
  greetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  greetIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  greetText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.2,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },

  dateText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "400",
    paddingHorizontal: 18,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
});
