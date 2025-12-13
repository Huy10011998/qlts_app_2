import { HandleCascadeChangeProps } from "../../types/Components.d";
import { fetchReferenceByFieldWithParent } from "./FetchReferenceByFieldWithParent";

export const handleCascadeChange = ({
  name,
  value,
  fieldActive,
  setFormData,
  setReferenceData,
}: HandleCascadeChangeProps) => {
  setFormData((prev: any) => {
    const next = { ...prev, [name]: value };

    const fieldCurrent = fieldActive.find((f) => f.name === name);
    if (!fieldCurrent) return next;

    // Không cascade nếu value invalid
    if (
      value === null ||
      value === "" ||
      (typeof value === "number" && value < 0)
    ) {
      return next;
    }

    // Danh sách field phía sau
    const cascadeFields = fieldActive.slice(
      fieldActive.findIndex((f) => f.name === name) + 1
    );

    cascadeFields.forEach((f) => {
      // Chỉ xử lý field có parentsFields
      if (!f.parentsFields) return;

      const parents = f.parentsFields.split(",");

      // Nếu field hiện tại KHÔNG phải là parent → skip
      if (!parents.includes(name)) return;

      // Clear giá trị
      next[f.name] = null;

      // Clear reference data
      setReferenceData((prev) => ({
        ...prev,
        [f.name]: [],
      }));

      // Kiểm tra có đủ parent value chưa
      const parentValues = parents
        .map((p: string | number) => next[p])
        .filter((v: string | null) => v != null && v !== "");

      if (parentValues.length !== parents.length) return;

      // Fetch lại reference theo parent
      if (f.referenceName) {
        fetchReferenceByFieldWithParent(
          f.referenceName,
          f.name,
          parentValues.join(","),
          setReferenceData
        );
      }
    });

    return next;
  });
};
