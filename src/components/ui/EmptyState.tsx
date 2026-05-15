import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type EmptyStateProps = {
  iconName?: string;
  title: string;
  subtitle?: string;
  fullHeight?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

export default function EmptyState({
  iconName,
  title,
  subtitle,
  fullHeight = true,
  style,
  titleStyle,
  subtitleStyle,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, fullHeight && styles.fullHeight, style]}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <Ionicons name={iconName as any} size={32} color="#C7C7CC" />
        </View>
      ) : null}
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  fullHeight: {
    flex: 1,
    justifyContent: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#1A2340",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#8A95A3",
    textAlign: "center",
    lineHeight: 18,
  },
});
