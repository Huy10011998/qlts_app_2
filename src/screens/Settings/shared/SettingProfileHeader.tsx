import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C, useAppColors } from "../../../utils/helpers/colors";

const localStyles = StyleSheet.create({
  badgeIcon: {
    marginRight: 4,
  },
});

type SettingProfileHeaderProps = {
  name?: string;
  /** Chức danh trên nhãn dưới tên; chưa có thì ghi "Thành viên". */
  title?: string;
  avatarUrl?: string;
  safeTop?: number;
};

function getInitials(name?: string) {
  if (!name) return "?";

  return name
    .split(" ")
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function SettingProfileHeader({
  name,
  title,
  avatarUrl,
  safeTop = 44,
}: SettingProfileHeaderProps) {
  const colors = useAppColors();
  const initials = getInitials(name);

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8 }]}>
      <View style={styles.deco1} />
      <View style={styles.deco2} />

      <View style={[styles.avatarShadowWrap, { shadowColor: colors.shadow }]}>
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[C.redLight, C.redDeep]}
                style={styles.initialsGradient}
              >
                <Text style={styles.initials}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.name}>{name || "---"}</Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          {/* Cùng icon với dòng Chức danh ở Hồ sơ cá nhân. */}
          <Ionicons
            name="ribbon"
            size={10}
            color="rgba(255,255,255,0.85)"
            style={localStyles.badgeIcon}
          />
          <Text style={styles.badgeText} numberOfLines={1}>
            {title || "Thành viên"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingBottom: 20,
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    left: -40,
  },
  deco2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 20,
    right: -20,
  },
  avatarShadowWrap: {
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    marginBottom: 14,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
  },
  initialsGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  name: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    // Chức danh dài thì nhãn co lại và cắt "…", không tràn ra mép màn.
    maxWidth: "86%",
  },
  badge: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: {
    flexShrink: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
});
