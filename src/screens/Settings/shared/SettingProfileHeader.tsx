import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C } from "../../../utils/helpers/colors";

type SettingProfileHeaderProps = {
  name?: string;
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
  avatarUrl,
  safeTop = 44,
}: SettingProfileHeaderProps) {
  const initials = getInitials(name);

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8 }]}>
      <View style={styles.deco1} />
      <View style={styles.deco2} />

      <View style={styles.avatarShadowWrap}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
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
          <Ionicons
            name="shield-checkmark"
            size={10}
            color="rgba(255,255,255,0.85)"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.badgeText}>Thành viên</Text>
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
    shadowColor: "#000",
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
    backgroundColor: "#fff",
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
  },
  badge: {
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
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
});
