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
    const updated = { ...prev, [name]: value };

    const fieldCurrent = fieldActive.find((f) => f.name === name);
    if (!fieldCurrent) return updated;

    const clearCascade = (parent: string, obj: any) => {
      const parentField = fieldActive.find((f) => f.name === parent);
      if (!parentField?.cascadeClearFields) return;

      const childName = parentField.cascadeClearFields;

      obj[childName] = null;
      setReferenceData((prev: any) => ({ ...prev, [childName]: [] }));

      const childField = fieldActive.find((f) => f.name === childName);
      if (childField?.referenceName) {
        const parents = childField.parentsFields?.split(",") ?? [];
        const parentValues = parents
          .map((p: string | number) => obj[p])
          .filter((x: null) => x != null);

        fetchReferenceByFieldWithParent(
          childField.referenceName,
          childName,
          parentValues.join(","),
          setReferenceData
        );
      }

      clearCascade(childName, obj);
    };

    if (fieldCurrent.cascadeClearFields) {
      clearCascade(name, updated);
    }

    return updated;
  });
};
