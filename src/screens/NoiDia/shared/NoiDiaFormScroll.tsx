import React from "react";
import { Platform, ScrollView, StyleProp, ViewStyle } from "react-native";

type NoiDiaFormScrollProps = {
  contentContainerStyle: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Khung cuộn cho hai màn nhập của nhóm Nội địa.
 *
 * Cố tình KHÔNG dùng `KeyboardAvoidingView`, cũng KHÔNG tự đo rồi `scrollTo`:
 * cả hai cách đều phải chạy đua với animation bàn phím, và bản tự cuộn thì nhảy
 * một phát sau khi hệ thống đã cuộn xong nên nhìn giật, khó đoán. Việc tránh
 * bàn phím giao hết cho hệ điều hành —
 *
 * - iOS: `automaticallyAdjustKeyboardInsets` để UIKit tự chèn contentInset bằng
 *   chiều cao bàn phím. Nhờ vậy vùng nội dung vẫn cuộn được bình thường khi bàn
 *   phím đang bật, và ô đang gõ được lộ ra vừa đủ. Đây là đường native của
 *   Apple, không phải giải pháp chắp vá.
 * - Android: KHÔNG chắc chắn. Manifest có `windowSoftInputMode="adjustResize"`
 *   nhưng app đang `targetSdkVersion = 36`, mà từ API 35 Android bắt buộc
 *   edge-to-edge và bỏ qua adjustResize — cửa sổ không co lại nữa, muốn đúng
 *   thì phải tự đọc `WindowInsets.Type.ime()`. Chưa test trên máy Android 15+.
 *
 * Muốn làm cho đúng cả hai nền, và có thêm thanh "Trước / Sau / Xong" trên bàn
 * phím cho form nhiều field: `react-native-keyboard-controller` (dùng
 * `keyboardLayoutGuide` của iOS và `WindowInsetsAnimation` của Android). Cần
 * thêm Reanimated + build lại native nên để thành một đợt riêng, làm luôn cho
 * cả các form tài sản.
 */
export default function NoiDiaFormScroll({
  contentContainerStyle,
  children,
}: NoiDiaFormScrollProps) {
  return (
    <ScrollView
      contentContainerStyle={contentContainerStyle}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  );
}
