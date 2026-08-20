import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeGuideStyles } from "../GuideScreen.styles";
import GuideBlockRenderer from "./GuideBlockRenderer";
import type { GuideSection } from "./guideTypes";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Một mục của chủ đề, thành một thẻ riêng.
 *
 * `collapsible` dùng cho Câu hỏi thường gặp: gập sẵn để cả danh sách câu hỏi vừa
 * một màn, người dùng chỉ mở câu của mình. Chủ đề thường thì mở hết — hướng dẫn
 * theo bước mà phải bấm mở từng mục thì đọc rất vướng.
 */
export default function GuideSectionCard({
  section,
  collapsible = false,
}: {
  section: GuideSection;
  collapsible?: boolean;
}) {
  const styles = useStyles(makeGuideStyles);
  const colors = useAppColors();
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((expanded) => !expanded);
  };

  const body = isExpanded ? (
    <>
      <View style={styles.sectionDivider} />
      <View style={styles.sectionBody}>
        {section.blocks.map((block, index) => (
          <GuideBlockRenderer key={`${section.id}-${index}`} block={block} />
        ))}
      </View>
    </>
  ) : null;

  if (!collapsible) {
    return (
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>{section.heading}</Text>
        </View>
        {body}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.sectionHeaderRow}
        onPress={toggle}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.sectionHeading}>{section.heading}</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {body}
    </View>
  );
}
