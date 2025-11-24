import React, { JSX } from "react";
import { ScrollView } from "react-native";
import { TabContentProps } from "../../types";
import AssetListHistory from "../assets/AssetListHistory";
import AssetListAttachFile from "../assets/AssetAttachFile";
import AssetNoteDetails from "../assets/AssetNoteDetails";
import AssetDeTailsTab from "../assets/AssetDetailsTab";
import AssetGroupList from "../assets/AssetGroupList";

export default function TabContent({
  activeTab,
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  previousItem,
  isFieldChanged,
  nameClass,
  fieldActive,
}: TabContentProps) {
  const tabContentMap: Record<string, JSX.Element> = {
    list: (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 70 }}>
        <AssetGroupList
          groupedFields={groupedFields}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          getFieldValue={getFieldValue}
          item={item}
          previousItem={previousItem}
          fieldActive={fieldActive}
          isFieldChanged={isFieldChanged}
          nameClass={nameClass}
        />
      </ScrollView>
    ),
    details: <AssetDeTailsTab />,
    notes: <AssetNoteDetails text={item?.notes ?? "---"} />,
    history: <AssetListHistory />,
    attach: <AssetListAttachFile />,
  };

  return (
    tabContentMap[activeTab] || <AssetNoteDetails text="Tab không hợp lệ" />
  );
}
