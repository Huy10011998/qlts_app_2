import React from "react";
import { Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

type AssetFormHeroCardProps = {
  iconBgColor: string;
  iconColor: string;
  iconName: string;
  styles: any;
  subtitle: string;
  title: string;
};

export default function AssetFormHeroCard({
  iconBgColor,
  iconColor,
  iconName,
  styles,
  subtitle,
  title,
}: AssetFormHeroCardProps) {
  return (
    <View style={styles.heroCard}>
      <View style={[styles.heroIconWrap, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSub}>{subtitle}</Text>
      </View>
    </View>
  );
}
