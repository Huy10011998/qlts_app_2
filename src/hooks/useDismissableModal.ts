import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/**
 * Giữ nội dung của Modal sống cho tới khi animation đóng chạy xong,
 * tránh việc unmount ngay lúc bấm back làm lộ nền trống (giật trắng 1 cái).
 *
 * - iOS: dọn nội dung ở `onDismiss` (chính xác theo animation thật).
 * - Android: không có `onDismiss` nên hẹn giờ theo `exitDurationMs`.
 */
export function useDismissableModal<T>(exitDurationMs: number = 350) {
  const [content, setContent] = useState<T | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const open = useCallback(
    (next: T) => {
      clearTimer();
      setContent(next);
      setVisible(true);
    },
    [clearTimer]
  );

  const close = useCallback(() => {
    setVisible(false);
    if (Platform.OS === "ios") return; // đã có onDismiss lo phần dọn nội dung
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setContent(null);
    }, exitDurationMs);
  }, [clearTimer, exitDurationMs]);

  // Gắn vào prop `onDismiss` của Modal (chỉ iOS gọi).
  const handleDismiss = useCallback(() => {
    clearTimer();
    setContent(null);
  }, [clearTimer]);

  return { content, visible, open, close, handleDismiss };
}
