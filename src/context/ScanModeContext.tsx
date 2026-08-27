import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { RecordActionKind } from "../constants/recordActionKinds";

/**
 * Chế độ quét đi qua bốn trạng thái, và thứ tự đó chính là cách người dùng làm
 * quen với máy quét:
 *
 * - `firstTime` — chưa quét bao giờ. Quét ra màn chi tiết tài sản như quy trình
 *   cũ, để người dùng thấy thiết bị rồi tự chọn việc ở thanh hành động.
 * - `ask` — đã quét ít nhất một lần nhưng chưa chốt việc. Quét xong hiện bảng
 *   chọn, và danh sách trong bảng LẤY TỪ CHÍNH TÀI SẢN VỪA QUÉT.
 * - `view` — đã chốt là chỉ xem thông tin. Quét ra màn chi tiết, không hỏi nữa.
 * - `action` — đã chốt một việc. Quét là chạy thẳng việc đó.
 *
 * `label`/`icon` được nhớ kèm chứ không tra bảng: app không có bảng liệt kê loại
 * việc nữa, nên pill phải tự nhớ chữ để hiện đúng ngay cả lúc chưa quét gì.
 */
export type ScanMode =
  | { state: "firstTime" }
  | { state: "ask" }
  | { state: "view" }
  | {
      state: "action";
      kind: RecordActionKind;
      label: string;
      icon?: string;
    };

type ScanModeContextValue = {
  isHydrated: boolean;
  mode: ScanMode;
  /** Loại việc đang nhớ, `null` khi chưa chốt việc nào. */
  modeKind: RecordActionKind | null;
  setMode: (mode: ScanMode) => void;
  /** Gọi sau lần quét đầu tiên: lần quét sau sẽ hỏi việc thay vì ra màn chi tiết. */
  markScanned: () => void;
};

const SCAN_MODE_KEY = "@qlts/scan-mode";

/** Khoá của công tắc "Đánh giá nhanh" thời chỉ có một việc duy nhất. */
const LEGACY_QUICK_REVIEW_KEY = "@qlts/quick-review-mode";

const FIRST_TIME: ScanMode = { state: "firstTime" };

/**
 * Giá trị cũ là chuỗi phẳng ("view", "danhGia", "trungChuyenTuLanh"…), giá trị mới
 * là JSON. Đọc được cả hai để máy đang dùng bản cũ không bị mất lựa chọn.
 */
const parseStoredMode = (raw: string | null): ScanMode | null => {
  if (!raw) return null;

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);

      if (parsed?.state === "action" && parsed.kind && parsed.label) {
        return {
          state: "action",
          kind: String(parsed.kind),
          label: String(parsed.label),
          icon: parsed.icon ? String(parsed.icon) : undefined,
        };
      }

      if (["firstTime", "ask", "view"].includes(parsed?.state)) {
        return { state: parsed.state };
      }
    } catch {
      // Chuỗi hỏng thì coi như chưa có gì, rơi xuống nhánh dưới.
    }

    return null;
  }

  if (raw === "view") return { state: "view" };

  // Chế độ cũ được đặt tên trong app; nay loại việc suy từ tên class con nên tên
  // cũ không còn khớp. Chỉ giữ lại được ý "người này đã chốt một việc rồi" —
  // đưa về `ask` để lần quét tới chọn lại, thay vì âm thầm về màn chi tiết.
  return { state: "ask" };
};

const ScanModeContext = createContext<ScanModeContextValue | undefined>(
  undefined,
);

/**
 * Không chặn cây app chờ đọc storage (khác `FontScaleProvider`): cờ này chỉ ảnh
 * hưởng lần quét đầu, mà lúc đó storage đã đọc xong từ lâu.
 */
export function ScanModeProvider({ children }: React.PropsWithChildren) {
  const [mode, setModeState] = useState<ScanMode>(FIRST_TIME);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      const stored = parseStoredMode(await AsyncStorage.getItem(SCAN_MODE_KEY));
      if (stored) return stored;

      // Ai đang bật công tắc "Đánh giá nhanh" của bản cũ thì coi như đã quen máy
      // quét: đưa thẳng sang `ask` để chọn lại việc, không bắt làm lại từ đầu.
      const legacy = await AsyncStorage.getItem(LEGACY_QUICK_REVIEW_KEY);
      if (legacy !== null) {
        const migrated: ScanMode =
          legacy === "true" ? { state: "ask" } : FIRST_TIME;

        await AsyncStorage.setItem(SCAN_MODE_KEY, JSON.stringify(migrated));
        await AsyncStorage.removeItem(LEGACY_QUICK_REVIEW_KEY);

        return migrated;
      }

      return FIRST_TIME;
    };

    hydrate()
      .then((next) => {
        if (!isActive) return;

        setModeState(next);
        setIsHydrated(true);
      })
      .catch(() => {
        // Đọc không được thì coi như chưa quét lần nào — luồng dài hơn nhưng không
        // bỏ qua bước xem thiết bị ngoài ý người dùng.
        if (isActive) setIsHydrated(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setMode = useCallback((next: ScanMode) => {
    setModeState(next);
    AsyncStorage.setItem(SCAN_MODE_KEY, JSON.stringify(next)).catch(() => {
      // Lựa chọn vẫn có hiệu lực trong phiên này dù lưu thất bại.
    });
  }, []);

  const markScanned = useCallback(() => {
    // Chỉ nhấc `firstTime` lên `ask`. Người đã chốt việc mà bị hỏi lại sau mỗi lần
    // quét thì đúng cái phiền vòng lặp này sinh ra để bỏ.
    setModeState((current) => {
      if (current.state !== "firstTime") return current;

      const next: ScanMode = { state: "ask" };
      AsyncStorage.setItem(SCAN_MODE_KEY, JSON.stringify(next)).catch(() => {});

      return next;
    });
  }, []);

  const value = useMemo<ScanModeContextValue>(
    () => ({
      isHydrated,
      mode,
      modeKind: mode.state === "action" ? mode.kind : null,
      setMode,
      markScanned,
    }),
    [isHydrated, markScanned, mode, setMode],
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
