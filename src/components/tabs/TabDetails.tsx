import React, { JSX } from "react";
import { ScrollView } from "react-native";
import GroupList from "../GroupList";
import CenterText from "../theme/ThemedCenterText";
import DeTailsTab from "../DetailsTab";
import { TabContentProps } from "../../types";
import AssetListHistory from "../assets/AssetListHistory";
import AssetListAttachFile from "../assets/AssetAttachFile";

export default function TabContent({
  activeTab,
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  previousItem,
  isFieldChanged,
}: TabContentProps) {
  const tabContentMap: Record<string, JSX.Element> = {
    list: (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 70 }}>
        <GroupList
          groupedFields={groupedFields}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          getFieldValue={getFieldValue}
          item={item}
          previousItem={previousItem}
          isFieldChanged={isFieldChanged}
        />
      </ScrollView>
    ),
    details: <DeTailsTab />,
    notes: <CenterText text={item?.notes ?? "---"} />,
    history: <AssetListHistory />,
    attach: <AssetListAttachFile />,
  };

  return tabContentMap[activeTab] || <CenterText text="Tab không hợp lệ" />;
}
