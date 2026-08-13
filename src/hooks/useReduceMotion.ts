import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Cờ "giảm chuyển động" của hệ điều hành, cập nhật khi người dùng đổi cài đặt.
 *
 * Trả `null` khi chưa đọc xong — nơi gọi tự quyết định: chuyển động lặp vô hạn
 * thì nên chờ (khỏi chớp một nhịp), còn chuyển động một lần do người dùng bấm thì
 * coi như bình thường vì lúc đó cờ đã đọc xong từ lâu.
 */
export function useReduceMotion(): boolean | null {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
