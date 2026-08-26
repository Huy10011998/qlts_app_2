import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type QuickReviewContextValue = {
  /** Bật thì quét xong vào thẳng màn đánh giá, không dừng ở màn chi tiết. */
  enabled: boolean;
  /** Đã đọc xong lựa chọn đã lưu hay chưa — công tắc chờ cờ này mới vẽ đúng. */
  isHydrated: boolean;
  setEnabled: (enabled: boolean) => void;
};

const QUICK_REVIEW_KEY = "@qlts/quick-review-mode";

const QuickReviewContext = createContext<QuickReviewContextValue | undefined>(
  undefined,
);

/**
 * Chế độ đánh giá nhanh của màn quét QR.
 *
 * Là lựa chọn của người dùng nên phải sống qua lần mở app sau: người đi kiểm kê
 * cả ngày bật một lần, người chỉ tra thông tin thiết bị thì để tắt.
 *
 * Khác `FontScaleProvider`: không chặn cây app chờ đọc storage. Cỡ chữ đọc muộn
 * là cả màn nháy cỡ, còn cờ này chỉ ảnh hưởng lần quét đầu — mà lúc đó storage
 * đã đọc xong từ lâu.
 */
export function QuickReviewProvider({ children }: React.PropsWithChildren) {
  const [enabled, setEnabledState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(QUICK_REVIEW_KEY)
      .then((stored) => {
        if (!isActive) return;

        setEnabledState(stored === "true");
        setIsHydrated(true);
      })
      .catch(() => {
        // Đọc không được thì coi như tắt — luồng dài hơn nhưng không bỏ qua màn
        // xác nhận thiết bị ngoài ý người dùng.
        if (isActive) setIsHydrated(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    AsyncStorage.setItem(QUICK_REVIEW_KEY, String(next)).catch(() => {
      // Lựa chọn vẫn có hiệu lực trong phiên này dù lưu thất bại.
    });
  }, []);

  const value = useMemo<QuickReviewContextValue>(
    () => ({ enabled, isHydrated, setEnabled }),
    [enabled, isHydrated, setEnabled],
  );

  return (
    <QuickReviewContext.Provider value={value}>
      {children}
    </QuickReviewContext.Provider>
  );
}

export function useQuickReview() {
  const context = useContext(QuickReviewContext);

  if (!context) {
    throw new Error("useQuickReview must be used inside QuickReviewProvider");
  }

  return context;
}
