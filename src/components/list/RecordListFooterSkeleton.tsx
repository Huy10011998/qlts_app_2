import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { useSkeletonPulse } from "../ui/useSkeletonAutoFill";
import RecordCardSkeleton, {
  type RecordCardTrailing,
  type RecordCardVariant,
} from "./RecordCardSkeleton";

/**
 * Khung chờ ở đáy danh sách lúc cuộn tới cuối và đang nạp trang kế
 * (`ListFooterComponent`) — thay vòng xoay nhỏ.
 *
 * Vẽ đúng dáng thẻ của danh sách đó (cùng `variant` / `lines` / `trailing` với
 * khung chờ lúc mở màn), nên trông như các thẻ kế tiếp đang hiện dần ra, và lúc
 * trang mới về thì thẻ thật thay vào đúng chỗ.
 */
export default function RecordListFooterSkeleton({
  variant = "avatar",
  lines = 3,
  media = 0,
  lineHeight,
  avatarAlign,
  trailing = "none",
  rows = 2,
  cardStyle,
}: {
  variant?: RecordCardVariant;
  lines?: number;
  media?: number;
  /** Xem `RecordCardSkeleton` — truyền y như khung chờ lúc mở màn. */
  lineHeight?: number;
  avatarAlign?: "center" | "top";
  trailing?: RecordCardTrailing;
  rows?: number;
  /**
   * Lề của thẻ. `RecordCardSkeleton` tự có lề ngang 12 như `ListCardAsset`; danh
   * sách đã có lề ngang ở `contentContainerStyle` thì truyền
   * `{ marginHorizontal: 0 }` để khỏi thụt vào hai lần.
   */
  cardStyle?: StyleProp<ViewStyle>;
}) {
  const opacity = useSkeletonPulse();

  return (
    <View accessibilityLabel="Đang tải thêm">
      {Array.from({ length: rows }).map((_, index) => (
        <RecordCardSkeleton
          key={index}
          variant={variant}
          lines={lines}
          media={media}
          lineHeight={lineHeight}
          avatarAlign={avatarAlign}
          trailing={trailing}
          separator={variant === "plain"}
          opacity={opacity}
          style={cardStyle}
        />
      ))}
    </View>
  );
}
