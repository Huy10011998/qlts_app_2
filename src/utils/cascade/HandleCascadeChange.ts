import { HandleCascadeChangeProps } from "../../types/Components.d";
import { TypeProperty } from "../Enum";
import { fetchReferenceByFieldWithParent } from "./FetchReferenceByFieldWithParent";

export const handleCascadeChange = ({
  name,
  value,
  fieldActive,
  setFormData,
  setReferenceData,

  // thêm 2 cái này (optional để không vỡ code cũ)
  setRefPage,
  setRefHasMore,
}: HandleCascadeChangeProps) => {
  setFormData((prev: any) => {
    const next = { ...prev, [name]: value };

    const fieldIndex = fieldActive.findIndex((f) => f.name === name);
    if (fieldIndex === -1) return next;

    const isInvalid =
      value === null ||
      value === "" ||
      (typeof value === "number" && value < 0);

    // ⭐ tất cả field phía sau
    const cascadeFields = fieldActive.slice(fieldIndex + 1);

    cascadeFields.forEach((f) => {
      if (!f.parentsFields) return;

      const parents = f.parentsFields.split(",").map((p: string) => p.trim());

      // field hiện tại không phải parent của nó
      if (!parents.includes(name)) return;

      // bỏ qua Date / Time
      if (
        f.typeProperty === TypeProperty.Date ||
        f.typeProperty === TypeProperty.Time
      ) {
        return;
      }

      //STEP 1 — CLEAR CHILD
      next[f.name] = null;

      setReferenceData((prevRef: any) => ({
        ...prevRef,
        [f.name]: {
          items: [],
          totalCount: 0,
        },
      }));

      //  STEP 2 — RESET PAGINATION
      setRefPage?.(0);
      setRefHasMore?.(true);

      // STEP 3 — nếu parent invalid → STOP
      if (isInvalid) return;

      // STEP 4 — check đủ parent chưa
      const parentValues = parents
        .map((p: string | number) => next[p])
        .filter((v: string | null) => v != null && v !== "");

      if (parentValues.length !== parents.length) return;

      // STEP 5 — FETCH LẠI từ page 0
      if (f.referenceName) {
        fetchReferenceByFieldWithParent(
          f.referenceName,
          f.name,
          parentValues.join(","),
          setReferenceData,
          {
            pageSize: 20,
            skipSize: 0, //  luôn reset
          },
        );
      }
    });

    return next;
  });
};
