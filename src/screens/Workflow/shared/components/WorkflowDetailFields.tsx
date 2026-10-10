import React from "react";

import AssetGroupList from "../../../../components/assets/AssetGroupList";
import { useGroupedFields } from "../../../../hooks/AssetAddItem/useGroupedFields";
import { formatWorkflowValue, WorkflowField } from "../workflowFields";

type Props = {
  item: Record<string, any>;
  /** Field đã lọc + sắp cho màn chi tiết (`getDetailFields`). */
  fields: WorkflowField[];
};

/**
 * Phần động của màn chi tiết: nhóm theo groupLayout (trống = "Thông tin
 * chung"), giá trị đọc qua `formatWorkflowValue` (Enum lấy `_MoTa`, Date theo
 * giờ địa phương). Khung nhóm dùng lại của màn chi tiết tài sản.
 */
export default function WorkflowDetailFields({ item, fields }: Props) {
  const { groupedFields, collapsedGroups, toggleGroup } = useGroupedFields(fields);

  return (
    <AssetGroupList
      groupedFields={groupedFields}
      collapsedGroups={collapsedGroups}
      toggleGroup={toggleGroup}
      getFieldValue={formatWorkflowValue}
      item={item}
    />
  );
}
