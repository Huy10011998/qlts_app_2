import React from "react";
import { StyleSheet, View } from "react-native";
import TabContent from "../../components/tabs/TabDetails";
import AssetHistoryDetails from "../../components/assets/AssetHistoryDetails";

export default function AssetRelatedDeTailsHistoryScreen() {
  return (
    <View style={styles.container}>
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
          />
        )}
      </AssetHistoryDetails>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
});
