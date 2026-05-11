import React from "react";
import { Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { sharedAssetListStyles as styles } from "./listStyles";

type AssetListEmptyStateProps = {
  iconName: string;
  title: string;
  subtitle: string;
  fullHeight?: boolean;
};

export default function AssetListEmptyState({
  iconName,
  title,
  subtitle,
  fullHeight = false,
}: AssetListEmptyStateProps) {
  return (
    <View style={[styles.emptyWrap, fullHeight && { flex: 1, justifyContent: "center" }]}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={iconName as any} size={32} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}
