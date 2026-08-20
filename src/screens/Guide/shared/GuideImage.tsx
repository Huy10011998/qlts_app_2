import React from "react";
import { Image, Text, View, type ImageSourcePropType } from "react-native";

import { useStyles } from "../../../utils/helpers/colors";
import { makeGuideStyles } from "../GuideScreen.styles";

/**
 * Ảnh minh hoạ trong tài liệu.
 *
 * Ảnh rộng hết bề ngang thẻ và cao theo `aspectRatio` chứ không theo pixel thật:
 * screenshot điện thoại to hơn bề ngang thẻ nhiều lần, để nguyên là tràn màn.
 * Mặc định 0.5 — tỷ lệ xấp xỉ của một ảnh chụp dọc.
 */
export default function GuideImage({
  source,
  caption,
  aspectRatio = 0.5,
}: {
  source: ImageSourcePropType;
  caption?: string;
  aspectRatio?: number;
}) {
  const styles = useStyles(makeGuideStyles);

  return (
    <View>
      <Image
        source={source}
        style={[styles.image, { aspectRatio }]}
        resizeMode="contain"
        accessible
        accessibilityLabel={caption ?? "Ảnh minh hoạ hướng dẫn"}
      />
      {caption ? <Text style={styles.imageCaption}>{caption}</Text> : null}
    </View>
  );
}
