import { useEffect, useRef, useState } from "react";
import { TypeProperty } from "../../utils/Enum";
import { fetchEnumByField } from "../../utils/fetchField/FetchEnumField";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import type { Field, ReferenceDataMap } from "../../types/index";

export function useEnumAndReferenceLoader(
  fieldActive: Field[],
  setEnumData: any,
  setReferenceData: any,
  referenceData: ReferenceDataMap,
) {
  /* Enum chỉ có lượt tải lúc mở form; picker mở trước khi lượt đó về thì danh
     sách rỗng, trông y như "Không tìm thấy dữ liệu". Giữ tên field Enum mà
     lượt tải ĐẦU chưa xong để picker hiện khung chờ. Lượt tải lại sau đó (đổi
     `fieldActive`) không bật lại cờ: danh sách đã có thì cứ hiện. Tải hỏng
     cũng tính là xong — `fetchEnumByField` tự nuốt lỗi, chờ tiếp thì khung chờ
     không bao giờ tắt. */
  const [pendingEnumFields, setPendingEnumFields] = useState<
    Record<string, true>
  >({});
  const settledEnumFieldsRef = useRef(new Set<string>());

  /* Enum tách khỏi effect của Reference: Enum không phụ thuộc `referenceData`,
     chung một effect thì mỗi lần một ô tham chiếu tải trang / tìm kiếm / mở
     sheet là tải lại TOÀN BỘ Enum của form. */
  useEffect(() => {
    const firstEnumLoads: string[] = [];

    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Enum && f.enumName) {
        const fieldName = f.name;
        const isFirstLoad = !settledEnumFieldsRef.current.has(fieldName);
        if (isFirstLoad) firstEnumLoads.push(fieldName);

        Promise.resolve(
          fetchEnumByField(f.enumName, fieldName, setEnumData),
        ).finally(() => {
          if (!isFirstLoad || settledEnumFieldsRef.current.has(fieldName)) {
            return;
          }

          settledEnumFieldsRef.current.add(fieldName);
          setPendingEnumFields((prev) => {
            if (!prev[fieldName]) return prev;
            const next = { ...prev };
            delete next[fieldName];
            return next;
          });
        });
      }
    });

    if (firstEnumLoads.length) {
      setPendingEnumFields((prev) => {
        const added = firstEnumLoads.filter((name) => !prev[name]);
        if (!added.length) return prev;

        const next = { ...prev };
        added.forEach((name) => {
          next[name] = true;
        });
        return next;
      });
    }
  }, [fieldActive, setEnumData]);

  useEffect(() => {
    fieldActive.forEach((f) => {
      if (
        f.typeProperty === TypeProperty.Reference &&
        f.referenceName &&
        !f.parentsFields &&
        !referenceData[f.name]
      ) {
        fetchReferenceByField(f.referenceName, f.name, setReferenceData, {
          pageSize: 20,
          skipSize: 0,
        });
      }
    });
  }, [fieldActive, referenceData, setReferenceData]);

  return { pendingEnumFields };
}
