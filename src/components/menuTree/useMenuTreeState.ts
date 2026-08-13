import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { error } from "../../utils/Logger";

/** Mục lá đã mở, đủ để mở lại từ hàng Truy cập nhanh. */
export type MenuTreeRecent = { id: string | number; label: string };

const RECENTS_KEY = "@menuTree:recents";
const EXPANDED_KEY = "@menuTree:expanded";
/** Nhiều hơn nữa thì hàng chip thành một danh sách thứ hai, mất tác dụng. */
export const MAX_RECENTS = 6;

const recentsKeyFor = (scope: string) => `${RECENTS_KEY}:${scope}`;
const expandedKeyFor = (scope: string) => `${EXPANDED_KEY}:${scope}`;

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch (e) {
    error("Đọc trạng thái menu tài sản lỗi:", e);
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch((e) =>
    // Ghi nhớ chỉ là tiện lợi, hỏng thì màn vẫn dùng bình thường.
    error("Lưu trạng thái menu tài sản lỗi:", e),
  );
};

const toggleId = (ids: (string | number)[], id: string | number) =>
  ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];

type SearchState = {
  hasSearch: boolean;
  /** Các nhánh có kết quả, do bộ lọc tính ra. */
  autoExpanded: (string | number)[];
};

/**
 * Ghi nhớ giữa các lần mở màn cho các màn dạng cây menu (tài sản, camera): mục
 * vừa dùng (cho hàng Truy cập nhanh) và nhóm nào đang mở.
 *
 * Trạng thái gập/mở được giữ thành **hai tập riêng**: tập của người dùng (lưu
 * xuống máy) và tập tạm trong lúc tìm kiếm (không lưu). Nếu dùng chung một tập,
 * việc tự mở các nhánh có kết quả sẽ ghi đè lên những nhóm người dùng đã tự mở,
 * và xoá từ khoá xong thì danh sách trả về với đúng những nhánh mà bộ lọc mở chứ
 * không phải trạng thái trước khi tìm.
 *
 * Tách theo `scope` vì mỗi cây là một tập mục khác nhau (Tài sản, Hồ sơ dự án,
 * Camera...), trộn chung sẽ ra mục không thuộc cây đang xem.
 */
export function useMenuTreeState<TRecent extends MenuTreeRecent>(
  scope: string,
  search?: SearchState,
) {
  const hasSearch = search?.hasSearch ?? false;
  const autoExpanded = search?.autoExpanded;

  const [recents, setRecents] = useState<TRecent[]>([]);
  const [userExpandedIds, setUserExpandedIds] = useState<(string | number)[]>(
    [],
  );
  const [searchExpandedIds, setSearchExpandedIds] = useState<
    (string | number)[]
  >([]);
  /** Chưa đọc xong thì đừng ghi đè: nếu không sẽ xoá state cũ bằng mảng rỗng. */
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadedRef.current = false;

    Promise.all([
      readJson<TRecent[]>(recentsKeyFor(scope), []),
      readJson<(string | number)[]>(expandedKeyFor(scope), []),
    ]).then(([storedRecents, storedExpanded]) => {
      if (!active) return;

      setRecents(storedRecents.slice(0, MAX_RECENTS));
      setUserExpandedIds(storedExpanded);
      loadedRef.current = true;
    });

    return () => {
      active = false;
    };
  }, [scope]);

  // Từ khoá đổi thì mở sẵn đúng các nhánh có kết quả của lần lọc mới.
  useEffect(() => {
    if (!hasSearch || !autoExpanded) return;

    setSearchExpandedIds(autoExpanded);
  }, [autoExpanded, hasSearch]);

  const persistUserExpanded = useCallback(
    (ids: (string | number)[]) => {
      if (!loadedRef.current) return;

      writeJson(expandedKeyFor(scope), ids);
    },
    [scope],
  );

  const rememberRecent = useCallback(
    (target: TRecent) => {
      setRecents((prev) => {
        const next = [
          target,
          ...prev.filter((item) => item.id !== target.id),
        ].slice(0, MAX_RECENTS);

        writeJson(recentsKeyFor(scope), next);
        return next;
      });
    },
    [scope],
  );

  const toggleExpanded = useCallback(
    (id: string | number) => {
      // Gập/mở trong lúc tìm kiếm chỉ có tác dụng cho lần lọc đó, không ghi đè
      // trạng thái người dùng đã chọn.
      if (hasSearch) {
        setSearchExpandedIds((prev) => toggleId(prev, id));
        return;
      }

      setUserExpandedIds((prev) => {
        const next = toggleId(prev, id);

        persistUserExpanded(next);
        return next;
      });
    },
    [hasSearch, persistUserExpanded],
  );

  const collapseAll = useCallback(() => {
    if (hasSearch) {
      setSearchExpandedIds([]);
      return;
    }

    setUserExpandedIds([]);
    persistUserExpanded([]);
  }, [hasSearch, persistUserExpanded]);

  return {
    recents,
    rememberRecent,
    /** Tập đang áp dụng cho danh sách: tạm khi tìm kiếm, của người dùng khi không. */
    expandedIds: hasSearch ? searchExpandedIds : userExpandedIds,
    toggleExpanded,
    collapseAll,
  };
}
