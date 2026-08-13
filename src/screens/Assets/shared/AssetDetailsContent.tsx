import React from "react";
import { StyleSheet, View } from "react-native";
import DetailSectionTabs from "../../../components/tabs/DetailSectionTabs";
import { useDetailTabBadges } from "../../../components/tabs/useDetailTabBadges";
import TabContent from "../../../components/tabs/TabContent";
import type { Field, TabItem } from "../../../types/index";
import type { AssetItem } from "../../../types/navigator.d";

type AssetDetailsContentProps = {
  activeTab: string;
  groupedFields: Record<string, Field[]>;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (groupName: string) => void;
  getFieldValue: (item: AssetItem, field: Field) => React.ReactNode;
  item: AssetItem;
  nameClass?: string;
  fieldActive: Field[];
  setActiveTab?: (tabKey: string, label: string) => void;
  tabs?: readonly TabItem[];
  loadErrorMessage?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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
  loadErrorMessage,
  onRefresh,
  isRefreshing,
}: AssetDetailsContentProps) {
  const tabsWithBadges = useDetailTabBadges({ tabs, item, nameClass });

  return (
    <>
      {setActiveTab && tabsWithBadges ? (
        <DetailSectionTabs
          activeTab={activeTab}
          onTabPress={setActiveTab}
          tabs={tabsWithBadges}
        />
      ) : null}

      <View style={styles.content}>
        <TabContent
          activeTab={activeTab}
          groupedFields={groupedFields}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          getFieldValue={getFieldValue}
          item={item}
          nameClass={nameClass || ""}
          fieldActive={fieldActive}
          loadErrorMessage={loadErrorMessage}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
