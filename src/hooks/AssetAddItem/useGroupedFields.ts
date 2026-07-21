import { useMemo, useEffect, useState } from "react";
import { parseFieldActive } from "../../utils/parser/parseFieldActive";
import { groupFields } from "../../utils/parser/groupFields";
import { toggleGroupUtil } from "../../utils/parser/ToggleGroup";
import type { Field } from "../../types/index";

export function useGroupedFields(field: any) {
  const fieldActive = useMemo<Field[]>(() => parseFieldActive(field), [field]);

  const groupedFields = useMemo(() => groupFields(fieldActive), [fieldActive]);

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
    setCollapsedGroups((prev) => toggleGroupUtil(prev, groupName));
  };

  const expandGroupsWithErrors = (errors: Record<string, string>) => {
    const errorNames = new Set(Object.keys(errors));
    if (!errorNames.size) return;

    setCollapsedGroups((prev) => {
      const next = { ...prev };

      Object.entries(groupedFields).forEach(([groupName, fields]) => {
        if (fields.some((f) => errorNames.has(f.name))) {
          next[groupName] = false;
        }
      });

      return next;
    });
  };

  return {
    fieldActive,
    groupedFields,
    collapsedGroups,
    toggleGroup,
    expandGroupsWithErrors,
  };
}
