import { useMemo, useEffect, useState } from "react";
import { ParseFieldActive } from "../../utils/parser/parseFieldActive";
import { GroupFields } from "../../utils/parser/groupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import type { Field } from "../../types/index";

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

  const expandGroupsWithErrors = (errors: Record<string, string>) => {
    const errorNames = new Set(Object.keys(errors));
    if (!errorNames.size) return;

    setCollapsedGroups((prev) => {
      const next = { ...prev };

      Object.entries(groupedFields).forEach(([groupName, fields]) => {
        if (fields.some((field) => errorNames.has(field.name))) {
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
