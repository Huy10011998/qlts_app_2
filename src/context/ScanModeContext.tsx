import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RECORD_ACTION_KINDS,
  type RecordActionKind,
} from "../constants/recordActionKinds";

/** "view" = quét xong mở màn thông tin thiết bị, không làm gì thêm. */
export type ScanMode = RecordActionKind | "view";

type ScanModeContextValue = {
  isHydrated: boolean;
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
};

const SCAN_MODE_KEY = "@qlts/scan-mode";

/** Khoá của công tắc "Đánh giá nhanh" thời chỉ có một việc duy nhất. */
const LEGACY_QUICK_REVIEW_KEY = "@qlts/quick-review-mode";

const VALID_MODES = new Set<string>([
  "view",
  ...RECORD_ACTION_KINDS.map((info) => info.kind),
]);

const ScanModeContext = createContext<ScanModeContextValue | undefined>(
  undefined,
);

/**
 * Chế độ quét: việc sẽ làm với mọi mã quét được, tới khi người dùng đổi.
 *
 * Là lựa chọn của người dùng nên sống qua lần mở app sau: đi kiểm kê cả buổi thì
 * chọn một lần, không phải chọn lại cho từng thiết bị.
 *
 * Không chặn cây app chờ đọc storage (khác `FontScaleProvider`): cờ này chỉ ảnh
 * hưởng lần quét đầu, mà lúc đó storage đã đọc xong từ lâu.
 */
export function ScanModeProvider({ children }: React.PropsWithChildren) {
  const [mode, setModeState] = useState<ScanMode>("view");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      const stored = await AsyncStorage.getItem(SCAN_MODE_KEY);

      if (stored && VALID_MODES.has(stored)) return stored as ScanMode;

      // Chuyển từ công tắc boolean cũ sang: ai đang bật "Đánh giá nhanh" thì giữ
      // nguyên việc họ đang làm, không tự tắt về "xem thông tin" sau khi cập nhật.
      const legacy = await AsyncStorage.getItem(LEGACY_QUICK_REVIEW_KEY);
      if (legacy !== null) {
        const migrated: ScanMode = legacy === "true" ? "danhGia" : "view";

        await AsyncStorage.setItem(SCAN_MODE_KEY, migrated);
        await AsyncStorage.removeItem(LEGACY_QUICK_REVIEW_KEY);

        return migrated;
      }

      return "view" as ScanMode;
    };

    hydrate()
      .then((next) => {
        if (!isActive) return;

        setModeState(next);
        setIsHydrated(true);
      })
      .catch(() => {
        // Đọc không được thì coi như xem thông tin — luồng dài hơn nhưng không
        // bỏ qua bước xác nhận thiết bị ngoài ý người dùng.
        if (isActive) setIsHydrated(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setMode = useCallback((next: ScanMode) => {
    setModeState(next);
    AsyncStorage.setItem(SCAN_MODE_KEY, next).catch(() => {
      // Lựa chọn vẫn có hiệu lực trong phiên này dù lưu thất bại.
    });
  }, []);

  const value = useMemo<ScanModeContextValue>(
    () => ({ isHydrated, mode, setMode }),
    [isHydrated, mode, setMode],
  );

  return (
    <ScanModeContext.Provider value={value}>
      {children}
    </ScanModeContext.Provider>
  );
}

export function useScanMode() {
  const context = useContext(ScanModeContext);

  if (!context) {
    throw new Error("useScanMode must be used inside ScanModeProvider");
  }

  return context;
}
