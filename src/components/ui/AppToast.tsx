import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import InlineToast, { type InlineToastTone } from "./InlineToast";

export type AppToastPayload = {
  message: string;
  /** Dòng phụ, ví dụ mã bản ghi vừa lưu. */
  detail?: string;
  tone?: InlineToastTone;
  durationMs?: number;
};

type AppToastState = AppToastPayload & { key: number };

let showListener: ((toast: AppToastPayload) => void) | null = null;

/**
 * Hiện dải thông báo nhỏ tự tắt, gọi được từ bất kỳ đâu (kể cả ngay trước
 * `navigation.goBack()`): dải nằm ở gốc app nên vẫn còn sau khi màn vừa lưu đã
 * đóng.
 *
 * Dùng thay cho `Alert` "Lưu thành công" — mỗi lần lưu bắt bấm thêm OK là một thao
 * tác thừa. Lỗi, hay lưu xong nhưng có phần hỏng (file không tải lên được), thì
 * vẫn dùng Alert để người dùng không bỏ lỡ.
 */
export const showAppToast = (toast: AppToastPayload) => {
  showListener?.(toast);
};

/** Khoảng cách tới đáy: chừa thanh tab (cao ~70) và nút Quét QR nhô lên. */
const BOTTOM_OFFSET = 96;

/** Đặt một lần ở gốc app, ngoài NavigationContainer. */
export function AppToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<AppToastState | null>(null);

  useEffect(() => {
    showListener = (next) => setToast({ ...next, key: Date.now() });

    return () => {
      showListener = null;
    };
  }, []);

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + BOTTOM_OFFSET }]}
    >
      {/* key đổi mỗi lần gọi: thông báo mới thay thông báo cũ và đếm giờ lại. */}
      <InlineToast
        key={toast.key}
        message={toast.message}
        detail={toast.detail}
        tone={toast.tone}
        durationMs={toast.durationMs}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
