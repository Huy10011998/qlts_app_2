import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import { readStoredAuthUsername } from "../../../context/authStorage";
import {
  getHomeBlockListKey,
  normalizeHomeBlockList,
  setHomeBlockInList,
} from "./homeBlockLists";
import type { HomeBlockKey } from "./homeBlockOrder";

/**
 * Một danh sách khối (đang thu gọn / đang ẩn) lưu trong máy, đọc/ghi giống
 * `useHomeBlockOrder`: một key AsyncStorage riêng cho từng username.
 */
export function useStoredHomeBlockList(baseKey: string) {
  const [keys, setKeys] = useState<HomeBlockKey[]>([]);
  // Đọc máy xong chưa (lỗi cũng tính). Trang chủ giữ khung chờ tới lúc này:
  // username đọc qua Keychain — trên Android chậm, về sau menu là khối đã ẩn
  // loé lên, khối đã thu gọn mở ra rồi mới đóng.
  const [isLoading, setIsLoading] = useState(true);
  // Ref thay vì state: lượt chạm phải ghi đúng key của user hiện tại ngay lúc
  // đó, không đợi closure cập nhật.
  const storageKeyRef = useRef(baseKey);
  // User đã đổi trước khi đọc máy xong thì giữ lượt đổi đó, không để dữ liệu cũ
  // đọc về sau đè lên.
  const hasLocalChangeRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const loadKeys = async () => {
      try {
        const storedUserName = await readStoredAuthUsername();
        const nextStorageKey = getHomeBlockListKey(baseKey, storedUserName);
        const rawValue = await AsyncStorage.getItem(nextStorageKey);

        if (!isActive) return;

        storageKeyRef.current = nextStorageKey;

        if (rawValue && !hasLocalChangeRef.current) {
          setKeys(normalizeHomeBlockList(JSON.parse(rawValue)));
        }
      } catch {
        // Đọc hỏng thì coi như danh sách rỗng — mở hết, hiện hết là an toàn nhất.
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadKeys();

    return () => {
      isActive = false;
    };
  }, [baseKey]);

  /** Thêm (`included = true`) hoặc bỏ một khối khỏi danh sách, rồi lưu máy. */
  const setIncluded = useCallback((key: HomeBlockKey, included: boolean) => {
    hasLocalChangeRef.current = true;

    setKeys((current) => {
      const next = setHomeBlockInList(current, key, included);

      if (next === current) return current;

      AsyncStorage.setItem(storageKeyRef.current, JSON.stringify(next)).catch(
        () => undefined,
      );

      return next;
    });
  }, []);

  return { keys, setIncluded, isLoading };
}
