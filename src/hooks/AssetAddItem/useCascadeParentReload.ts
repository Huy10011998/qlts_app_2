import { useEffect } from "react";
import type { Field } from "../../types/model.d";
import { TypeProperty } from "../../utils/Enum";
import { getParentGate } from "../../utils/cascade/parentGate";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";

/**
 * Nạp danh mục cho các ô chọn có cấp cha ở màn SỬA / SAO CHÉP.
 *
 * Hai màn đó khởi tạo `formData` từ bản ghi sẵn có (`setFormData(initial)`) nên
 * không đi qua `handleCascadeChange` — vốn chỉ chạy khi người dùng chạm. Không
 * có effect này thì ô con mở ra rỗng dù cha đã có giá trị.
 *
 * Trước đây hai màn tự viết lại luật bằng `parents.every((p) => formData[p])`:
 * truthy check nên id `0` bị coi là thiếu cha, và không kiểm giá trị có parse ra
 * số nguyên hay không. Nay dùng chung `getParentGate`.
 */
export const useCascadeParentReload = (
  fieldActive: Field[],
  formData: Record<string, any>,
  setReferenceData: React.Dispatch<React.SetStateAction<any>>,
) => {
  useEffect(() => {
    fieldActive.forEach((field) => {
      if (field.typeProperty !== TypeProperty.Reference) return;
      if (!field.parentsFields || !field.referenceName) return;

      const gate = getParentGate(field, formData);

      if (!gate.isReady) return;

      fetchReferenceByFieldWithParent(
        field.referenceName,
        field.name,
        gate.lstParent!,
        setReferenceData,
      );
    });
  }, [fieldActive, formData, setReferenceData]);
};
