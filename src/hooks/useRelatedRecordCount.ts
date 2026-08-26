import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import type { Conditions } from "../types";
import { getList } from "../services";
import { SqlOperator, TypeProperty } from "../utils/Enum";
import { isNetworkRequestError } from "../utils/helpers/api";
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
}: UseRelatedRecordCountParams) {
  const { isMounted } = useSafeAlert();
  const [count, setCount] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const isFirstFocusRef = useRef(true);

  const canCount = Boolean(enabled && idRoot && nameClass && propertyReference);

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
    if (!canCount) {
      setCount(null);
      return;
    }

    let active = true;
    const conditions: Conditions[] = [
      {
        property: propertyReference!,
        operator: SqlOperator.Equals,
        value: String(idRoot),
        type: TypeProperty.Int,
      },
    ];

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
  }, [canCount, idRoot, isMounted, nameClass, propertyReference, reloadToken]);

  return count;
}
