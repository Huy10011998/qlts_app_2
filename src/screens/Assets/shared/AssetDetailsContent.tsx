import React from "react";
import { StyleSheet, View } from "react-native";
import BottomBarDetails from "../../../components/bottom/BottomDetails";
import TabContent from "../../../components/tabs/TabContent";
import { Field, TabItem } from "../../../types/Index";

type AssetDetailsContentProps = {
  activeTab: string;
  groupedFields: Record<string, Field[]>;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (groupName: string) => void;
  getFieldValue: (item: Record<string, any>, field: Field) => string;
  item: any;
  nameClass?: string;
  fieldActive: Field[];
  setActiveTab?: (tabKey: string, label: string) => void;
  tabs?: readonly TabItem[];
  contentPaddingBottom?: number;
};

export default function AssetDetailsContent({
  activeTab,
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  nameClass,
  fieldActive,
  setActiveTab,
  tabs,
  contentPaddingBottom = 0,
}: AssetDetailsContentProps) {
  return (
    <>
      <View style={[styles.content, { paddingBottom: contentPaddingBottom }]}>
        <TabContent
          activeTab={activeTab}
          groupedFields={groupedFields}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          getFieldValue={getFieldValue}
          item={item}
          nameClass={nameClass || ""}
          fieldActive={fieldActive}
        />
      </View>

      {setActiveTab && tabs ? (
        <BottomBarDetails
          activeTab={activeTab}
          onTabPress={setActiveTab}
          tabs={tabs}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
