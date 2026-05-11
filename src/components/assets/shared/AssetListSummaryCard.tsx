import React from "react";
import { Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { BRAND_RED } from "./listTheme";
import { sharedAssetListStyles as styles } from "./listStyles";

type AssetListSummaryCardProps = {
  iconName: string;
  title: string;
  subtitle: string;
};

export default function AssetListSummaryCard({
  iconName,
  title,
  subtitle,
}: AssetListSummaryCardProps) {
  return (
    <View style={styles.stickyHeader}>
      <View style={styles.filterCard}>
        <View style={styles.filterCardIcon}>
          <Ionicons name={iconName as any} size={16} color={BRAND_RED} />
        </View>
        <View style={styles.filterCardContent}>
          <Text style={styles.filterCardTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.filterCardSub}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}
