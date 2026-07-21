import { useCallback, useMemo, useState } from "react";
import { parseFieldActive } from "../utils/parser/parseFieldActive";
import { groupFields } from "../utils/parser/groupFields";
import { toggleGroupUtil } from "../utils/parser/ToggleGroup";

export function useDetailViewState(
  field: string | undefined,
  initialTab = "list",
) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const fieldActive = useMemo(() => parseFieldActive(field), [field]);
  const groupedFields = useMemo(() => groupFields(fieldActive), [fieldActive]);

  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => toggleGroupUtil(prev, groupName));
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
