import { StyleSheet, View } from "react-native";
import TabContent from "../../components/tabs/TabContent";
import AssetRelatedDetails from "../../components/assets/AssetRelatedDetails";

export default function AssetRelatedDetailsScreen() {
  return (
    <View style={styles.container}>
      <AssetRelatedDetails>
        {({
          activeTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
        }) => (
          <>
            <View style={styles.content}>
              <TabContent
                activeTab={activeTab}
                groupedFields={groupedFields}
                collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup}
                getFieldValue={getFieldValue}
                item={item}
                fieldActive={[]}
              />
            </View>
          </>
        )}
      </AssetRelatedDetails>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  content: { flex: 1, paddingBottom: 60 },
});
