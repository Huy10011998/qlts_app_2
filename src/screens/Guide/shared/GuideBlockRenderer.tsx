import React from "react";
import { Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import { makeGuideStyles } from "../GuideScreen.styles";
import GuideImage from "./GuideImage";
import type { GuideBlock } from "./guideTypes";

/** Một khối nội dung trong tài liệu hướng dẫn. */
export default function GuideBlockRenderer({ block }: { block: GuideBlock }) {
  const styles = useStyles(makeGuideStyles);
  const colors = useAppColors();

  switch (block.kind) {
    case "paragraph":
      return <Text style={styles.paragraph}>{block.text}</Text>;

    case "steps":
      return (
        <View style={styles.listGap}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>
                  {index + 1}
                </Text>
              </View>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case "bullets":
      return (
        <View style={styles.listGap}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case "note": {
      const isWarn = block.tone === "warn";

      return (
        <View style={[styles.note, isWarn ? styles.noteWarn : styles.noteInfo]}>
          <Ionicons
            name={isWarn ? "alert-circle-outline" : "information-circle-outline"}
            size={17}
            color={isWarn ? colors.amber : colors.accent}
            style={styles.noteIcon}
          />
          <Text style={styles.noteText}>{block.text}</Text>
        </View>
      );
    }

    case "image":
      return (
        <GuideImage
          source={block.source}
          caption={block.caption}
          aspectRatio={block.aspectRatio}
        />
      );
  }
}
