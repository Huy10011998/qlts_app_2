import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import { readStoredAuthUsername } from "../../../context/authStorage";
import {
  DEFAULT_HOME_BLOCK_ORDER,
  getHomeBlockOrderKey,
  HOME_BLOCK_ORDER_KEY,
  moveHomeBlock,
  normalizeHomeBlockOrder,
  type HomeBlockKey,
} from "./homeBlockOrder";

/**
 * Thứ tự khối của Trang chủ, đọc/ghi theo đúng cách danh sách ghim đang dùng
 * trong `HomeMenuProvider`: một key AsyncStorage riêng cho từng username, để hai
 * người dùng chung một máy không đè cấu hình của nhau.
 */
export function useHomeBlockOrder() {
  const [blockOrder, setBlockOrder] = useState<HomeBlockKey[]>(
    DEFAULT_HOME_BLOCK_ORDER
  );
  // Ref thay vì state: `moveBlock` được gọi ngay lúc thả tay, không được phép
  // ghi bằng key cũ chỉ vì closure chưa kịp cập nhật.
  const storageKeyRef = useRef(HOME_BLOCK_ORDER_KEY);

  useEffect(() => {
    let isActive = true;

    const loadBlockOrder = async () => {
      try {
        const storedUserName = await readStoredAuthUsername();
        const nextStorageKey = getHomeBlockOrderKey(storedUserName);
        const rawValue = await AsyncStorage.getItem(nextStorageKey);

        if (!isActive) return;

        storageKeyRef.current = nextStorageKey;

        if (rawValue) {
          setBlockOrder(normalizeHomeBlockOrder(JSON.parse(rawValue)));
        }
      } catch {
        if (isActive) {
          setBlockOrder(DEFAULT_HOME_BLOCK_ORDER);
        }
      }
    };

    loadBlockOrder();

    return () => {
      isActive = false;
    };
  }, []);

  const moveBlock = useCallback(
    (args: {
      visibleKeys: HomeBlockKey[];
      fromIndex: number;
      toIndex: number;
    }) => {
      setBlockOrder((currentOrder) => {
        const nextOrder = moveHomeBlock({ order: currentOrder, ...args });

        if (nextOrder === currentOrder) return currentOrder;

        AsyncStorage.setItem(
          storageKeyRef.current,
          JSON.stringify(nextOrder)
        ).catch(() => undefined);

        return nextOrder;
      });
    },
    []
  );

  return { blockOrder, moveBlock };
}
