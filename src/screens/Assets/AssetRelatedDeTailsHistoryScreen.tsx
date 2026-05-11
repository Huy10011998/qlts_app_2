import React from "react";
import TabContent from "../../components/tabs/TabContent";
import AssetHistoryDetails from "../../components/assets/AssetHistoryDetails";
import ScreenContainer from "../shared/ScreenContainer";

export default function AssetRelatedDeTailsHistoryScreen() {
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
