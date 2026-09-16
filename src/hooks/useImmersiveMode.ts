import React from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  disableImmersiveMode,
  enableImmersiveMode,
} from "../services/immersive/immersiveMode";

/**
 * Ẩn status bar và navigation bar (taskbar trên máy tính bảng) trong lúc
 * `active` còn đúng và màn hình còn được focus.
 *
 * Luôn dùng hook này thay vì gọi thẳng enable/disable: bộ đếm bên trong
 * `immersiveMode.ts` chỉ khớp khi mỗi lượt bật đều có đúng một lượt tắt, mà
 * cleanup của effect là chỗ duy nhất đảm bảo được điều đó qua mọi đường thoát
 * (bấm nút, back cứng, unmount).
 *
 * Ràng theo `isFocused` để điều hướng sang màn khác là nhả thanh hệ thống ngay,
 * kể cả khi màn camera vẫn còn trong stack và chưa unmount.
 */
export function useImmersiveMode(active: boolean) {
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (!active || !isFocused) return;

    enableImmersiveMode();
    return () => disableImmersiveMode();
  }, [active, isFocused]);
}
