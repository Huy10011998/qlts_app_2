import React from "react";
import TabContent from "../../components/tabs/TabContent";
import AssetHistoryDetails from "../../components/assets/AssetHistoryDetails";
import ScreenContainer from "../shared/ScreenContainer";
import { useHeaderRecordPill } from "../../components/assets/shared/useHeaderRecordPill";
import { useParams } from "../../hooks/useParams";

export default function AssetRelatedDeTailsHistoryScreen() {
  const { idRoot, nameClass, rootRecordLabel } = useParams();

  // Tiêu đề màn là "Chi tiết lịch sử" nên pill là chỗ duy nhất cho biết đang xem
  // lịch sử của bản ghi nào; bấm vào là về chính bản ghi đó.
  useHeaderRecordPill({
    label: rootRecordLabel,
    recordId: idRoot,
    nameClass,
  });

  return (
    <ScreenContainer>
      <AssetHistoryDetails>
        {({
          activeTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          previousItem,
          getFieldValue,
          isFieldChanged,
        }) => (
          <TabContent
            activeTab={activeTab}
            groupedFields={groupedFields}
            collapsedGroups={collapsedGroups}
            toggleGroup={toggleGroup}
            getFieldValue={getFieldValue}
            item={item}
            previousItem={previousItem}
            isFieldChanged={isFieldChanged}
            fieldActive={[]}
          />
        )}
      </AssetHistoryDetails>
    </ScreenContainer>
  );
}
