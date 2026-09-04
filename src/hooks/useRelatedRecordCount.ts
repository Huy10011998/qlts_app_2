import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { getList } from "../services";
import { isNetworkRequestError } from "../utils/helpers/api";
import { useParentValuePairs } from "./parentValue/useParentValuePairs";
import { error } from "../utils/Logger";
import { useSafeAlert } from "./useSafeAlert";

/** Chỉ cần con số, không cần bản ghi nào — xin đúng 1 dòng cho nhẹ. */
const COUNT_PAGE_SIZE = 1;

type UseRelatedRecordCountParams = {
  enabled?: boolean;
  /** Bản ghi cha. */
  idRoot?: string;
  /** Class con cần đếm, ví dụ `DanhGia_BinhChuaChay`. */
  nameClass?: string;
  /** Cột trỏ về cha ở class con. */
  propertyReference?: string;
  /** Class CHA — để lấy trọn bộ cặp parent-value. */
  nameClassRoot?: string;
};

/**
 * Đếm số bản ghi con của một bản ghi cha, cho dòng phụ kiểu "Lịch sử đánh giá (7)".
 *
 * Cùng cách làm với badge tệp đính kèm trong `useDetailTabBadges`: một request
 * `pageSize: 1` rồi đọc `totalCount`, và **nuốt lỗi im lặng** — con số là thông
 * tin phụ, đếm không được thì ẩn đi chứ không báo lỗi chắn đường người dùng.
 *
 * Đếm lại mỗi lần màn được focus: vừa thêm một bản ghi con xong quay về là phải
 * thấy số mới.
 */
export function useRelatedRecordCount({
  enabled = true,
  idRoot,
  nameClass,
  propertyReference,
  nameClassRoot,
}: UseRelatedRecordCountParams) {
  const { isMounted } = useSafeAlert();
  const [count, setCount] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const isFirstFocusRef = useRef(true);

  const canCount = Boolean(enabled && idRoot && nameClass && propertyReference);

  /* Đếm phải dùng ĐÚNG bộ điều kiện của danh sách, không thì con số trên thanh
     đáy khác số dòng người dùng thấy khi mở ra (ca LinhKien: đếm cả linh kiện
     của Server). Nhờ cache module-level, badge và danh sách chỉ tốn 1 request
     parent-value cho cùng cặp (cha, con). */
  const { conditions, isReady: isParentValueReady } = useParentValuePairs({
    idRoot,
    nameClass,
    nameClassRoot,
    propertyReference,
    enabled: canCount,
  });

  useFocusEffect(
    useCallback(() => {
      // Lần focus đầu trùng với lần mount: để nó cũng tăng token là đếm hai lần
      // cho một lần vào màn.
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }

      setReloadToken((token) => token + 1);
    }, []),
  );

  useEffect(() => {
    // Chưa chốt được điều kiện thì giữ `null` = ẩn badge, đúng ngữ nghĩa
    // "chưa biết" của hook này.
    if (!canCount || !isParentValueReady) {
      setCount(null);
      return;
    }

    let active = true;

    getList(nameClass!, "id desc", COUNT_PAGE_SIZE, 0, "", conditions, [])
      .then((response) => {
        if (!active || !isMounted()) return;

        setCount(response?.data?.totalCount || 0);
      })
      .catch((e) => {
        if (!isNetworkRequestError(e)) error("Đếm bản ghi liên quan lỗi:", e);
        if (active) setCount(null);
      });

    return () => {
      active = false;
    };
  }, [
    canCount,
    conditions,
    isMounted,
    isParentValueReady,
    nameClass,
    reloadToken,
  ]);

  return count;
}
