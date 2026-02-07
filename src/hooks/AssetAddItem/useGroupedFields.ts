import { useMemo, useEffect, useState } from "react";
import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { Field } from "../../types/Index";

export function useGroupedFields(field: any) {
  const fieldActive = useMemo<Field[]>(() => ParseFieldActive(field), [field]);

  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };

      Object.keys(groupedFields).forEach((k) => {
        if (!(k in next)) {
          next[k] = false;
        }
      });

      return next;
    });
  }, [groupedFields]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

  return {
    fieldActive,
    groupedFields,
    collapsedGroups,
    toggleGroup,
  };
}
