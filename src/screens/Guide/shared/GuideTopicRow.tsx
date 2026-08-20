import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { C, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeGuideStyles } from "../GuideScreen.styles";
import type { GuideTopic } from "./guideTypes";

/** Một chủ đề trong danh sách hướng dẫn. */
export default function GuideTopicRow({
  topic,
  matchedHeadings,
  isLast,
  onPress,
}: {
  topic: GuideTopic;
  /** Các mục khớp từ khoá đang tìm; rỗng khi không tìm kiếm. */
  matchedHeadings: string[];
  isLast?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(makeGuideStyles);
  const colors = useAppColors();

  return (
    <TouchableOpacity
      style={[styles.topicRow, isLast && styles.topicRowLast]}
      onPress={onPress}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}. ${topic.summary}`}
    >
      <View style={[styles.topicIcon, { backgroundColor: topic.iconBg }]}>
        {topic.lib === "material-community" ? (
          <MaterialCommunityIcons
            name={topic.iconName}
            size={18}
            color={C.onBrand}
          />
        ) : (
          <Ionicons name={topic.iconName} size={18} color={C.onBrand} />
        )}
      </View>

      <View style={styles.topicTextCol}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicSummary}>{topic.summary}</Text>
        {/* Chỉ hiện vài mục đầu: gõ một từ chung như "quyen" thì gần như mọi mục
            đều khớp, liệt kê hết là hàng dài hơn cả thẻ. */}
        {matchedHeadings.length > 0 ? (
          <Text style={styles.topicMatch} numberOfLines={2}>
            {matchedHeadings.slice(0, 2).join(" • ")}
            {matchedHeadings.length > 2
              ? ` • +${matchedHeadings.length - 2} mục`
              : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}
