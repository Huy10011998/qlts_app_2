import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HOME_BRAND_RED } from "./homeTheme";

type HomeEventBannerProps = {
  title: string;
  date: string;
  time: string;
  venue: string;
  count: number;
  onPress?: () => void;
};

export default function HomeEventBanner({
  title,
  date,
  time,
  venue,
  count,
  onPress,
}: HomeEventBannerProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.stripe} />

      <View style={styles.content}>
        <View style={styles.datePill}>
          <Text style={styles.dateDay}>{date.split("/")[0]}</Text>
          <Text style={styles.dateMon}>Th{date.split("/")[1]}</Text>
        </View>

        <View style={styles.textBlock}>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Ionicons
                name="calendar"
                size={9}
                color={HOME_BRAND_RED}
                style={{ marginRight: 3 }}
              />
              <Text style={styles.tagText}>SỰ KIỆN SẮP TỚI</Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={11} color="#8A95A3" />
            <Text style={styles.meta}>{venue}</Text>
            <View style={styles.dot} />
            <Ionicons name="time-outline" size={11} color="#8A95A3" />
            <Text style={styles.meta}>{time}</Text>
          </View>
          <View style={styles.countRow}>
            <Ionicons name="people-outline" size={12} color={HOME_BRAND_RED} />
            <Text style={styles.countText}>{count} cổ đông đăng ký</Text>
          </View>
        </View>
      </View>

      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: HOME_BRAND_RED,
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
    color: HOME_BRAND_RED,
    lineHeight: 24,
  },
  dateMon: {
    fontSize: 10,
    fontWeight: "600",
    color: HOME_BRAND_RED,
    opacity: 0.7,
  },
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
    color: HOME_BRAND_RED,
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
  countText: { fontSize: 11, fontWeight: "600", color: HOME_BRAND_RED },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#F0F2F8",
    alignItems: "center",
    justifyContent: "center",
  },
});
