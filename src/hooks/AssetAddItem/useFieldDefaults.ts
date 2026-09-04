import { useEffect, useRef } from "react";
import type { Field } from "../../types/index";
import { getFieldDefault } from "../../utils/form/fieldDefaults";

/**
 * Điền sẵn giá trị mặc định khai trên field khi THÊM MỚI. Luật nằm ở
 * `src/utils/form/fieldDefaults.ts`.
 *
 * CHỈ dùng ở màn thêm mới. Màn Sửa và Sao chép không áp default (theo web) —
 * đừng gọi hook này ở đó.
 *
 * THỨ TỰ ÁP: default từ field TRƯỚC, rồi bộ cặp parent-value GHI ĐÈ nếu trùng
 * tên field. Ở màn thêm bản ghi con, `getFieldActive` và `getParentValue` là hai
 * request độc lập nên không đoán được cái nào về trước; guard `!(name in next)`
 * làm parent-value luôn thắng ở CẢ HAI chiều:
 *   · default xong trước -> `useLoadParentValue` spread `...nextFormValues` đè lên
 *   · parent-value xong trước -> key đã có, default không chen vào
 *
 * Cố ý dùng "có key" chứ không phải truthy: parent-value trả `0` là ID hợp lệ,
 * guard `!next[name]` cũ sẽ coi đó là trống và ghi đè default lên.
 */
export function useFieldDefaults(
  fieldActive: Field[],
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
) {
  /* Mỗi field chỉ áp default một lần trong đời form: `fieldActive` đổi tham
     chiếu (refetch, đổi tab) không được điền lại vào ô người dùng đã xoá trắng
     hoặc cascade vừa clear. */
  const appliedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!fieldActive?.length) return;

    setFormData((prev) => {
      const next = { ...prev };
      let changed = false;

      fieldActive.forEach((field) => {
        if (!field?.name) return;
        if (appliedRef.current.has(field.name)) return;
        if (field.name in next) return;

        const result = getFieldDefault(field);

        if (!result.has) return;

        next[field.name] = result.value;
        appliedRef.current.add(field.name);
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [fieldActive, setFormData]);
}
