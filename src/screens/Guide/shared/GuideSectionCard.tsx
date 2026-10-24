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
import { guideCardAccent, makeGuideStyles } from "../GuideScreen.styles";
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
  accent,
  asRow = false,
  isLast = false,
}: {
  section: GuideSection;
  collapsible?: boolean;
  /**
   * Màu của chủ đề chứa mục này: viền thẻ và các gạch ngang trong thẻ. Là dòng
   * trong thẻ nhóm thì truyền đúng màu của thẻ nhóm đó.
   */
  accent?: string;
  /**
   * Thành một dòng trong thẻ nhóm (Câu hỏi thường gặp gom theo nhóm) thay vì
   * thẻ riêng: bỏ khung, kẻ mảnh ngăn với dòng dưới.
   */
  asRow?: boolean;
  /** Dòng cuối của thẻ nhóm thì không kẻ phía dưới. */
  isLast?: boolean;
}) {
  const styles = useStyles(makeGuideStyles);
  const colors = useAppColors();
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((expanded) => !expanded);
  };

  const dividerStyle = [
    styles.sectionDivider,
    accent ? { backgroundColor: accent } : null,
  ];

  const body = isExpanded ? (
    <>
      <View style={dividerStyle} />
      <View style={styles.sectionBody}>
        {section.blocks.map((block, index) => (
          <GuideBlockRenderer key={`${section.id}-${index}`} block={block} />
        ))}
      </View>
    </>
  ) : null;

  const cardStyle = asRow ? null : [styles.card, guideCardAccent(accent)];
  const rowDivider =
    asRow && !isLast ? <View style={dividerStyle} /> : null;

  if (!collapsible) {
    return (
      <View style={cardStyle}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>{section.heading}</Text>
        </View>
        {body}
        {rowDivider}
      </View>
    );
  }

  return (
    <View style={cardStyle}>
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
      {rowDivider}
    </View>
  );
}
