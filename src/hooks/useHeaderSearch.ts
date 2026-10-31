import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";

import type { HeaderSearchOption } from "../types";

type UseHeaderSearchArgs = {
  /** Chữ đang gõ: vào màn mà đã có sẵn chữ thì mở ô ngay, không để lọc ngầm. */
  query: string;
  /** Xoá chữ khi đóng ô. */
  onClear: () => void;
  /** Màn lúc có lúc không cho tìm (vd chủ đề Hướng dẫn): false thì không có nút. */
  enabled?: boolean;
};

/**
 * Ô tìm kiếm ẩn sau nút kính lúp trên thanh đỏ (29/10): bình thường màn chỉ có
 * icon, đỡ một dải ~70pt dưới header; bấm icon thì ô trượt xuống ngay dưới header
 * và tự bật bàn phím. Bấm icon lần nữa hoặc ✕ trong ô thì xoá chữ rồi ẩn — ẩn
 * mà giữ chữ thì danh sách vẫn bị lọc, người dùng không biết vì sao thiếu dòng.
 *
 * Header do navigator dựng nên nút đi qua `setOptions({ headerSearch })`, rồi
 * `HeaderDetails` đọc ra vẽ. Màn tự quyết vẽ ô ở đâu: bọc ô trong
 * `HeaderSearchReveal open={open}` (trượt ra / vào), truyền `autoFocus` +
 * `onClose={close}` cho `SearchBar`.
 */
export function useHeaderSearch({
  query,
  onClear,
  enabled = true,
}: UseHeaderSearchArgs) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(() => query.trim().length > 0);
  // Màn hay truyền hàm viết tại chỗ (`() => setText("")`); giữ trong ref để
  // `toggle` không đổi mỗi lần render, kéo theo `setOptions` mỗi lần render.
  const onClearRef = useRef(onClear);
  useEffect(() => {
    onClearRef.current = onClear;
  });

  // Đóng ô rồi mà chữ quay lại thì xoá tiếp. Bộ gõ tiếng Việt (Telex/VNI) còn
  // chữ đang ghép: lúc ô mất focus nó chốt chữ và gửi `onChangeText` SAU lệnh
  // xoá của `close` — ô đã đóng mà danh sách vẫn bị lọc theo chữ cũ, trống trơn.
  useEffect(() => {
    if (!open && query.trim().length > 0) onClearRef.current();
  }, [open, query]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClearRef.current();
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      close();
      return;
    }

    setOpen(true);
  }, [close, open]);

  useLayoutEffect(() => {
    const headerSearch: HeaderSearchOption | undefined = enabled
      ? { active: open, onPress: toggle }
      : undefined;

    navigation.setOptions({ headerSearch } as object);
  }, [enabled, navigation, open, toggle]);

  return { open: enabled && open, close };
}
