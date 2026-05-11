import { useCallback, useMemo, useState } from "react";
import { ParseFieldActive } from "../utils/parser/ParseFieldActive";
import { GroupFields } from "../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../utils/parser/ToggleGroup";

export function useDetailViewState(
  field: string | undefined,
  initialTab = "list",
) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  }, []);

  const handleChangeTab = useCallback((tabKey: string) => {
    setActiveTab(tabKey);
  }, []);

  return {
    activeTab,
    collapsedGroups,
    fieldActive,
    groupedFields,
    setActiveTab,
    handleChangeTab,
    toggleGroup,
  };
}
