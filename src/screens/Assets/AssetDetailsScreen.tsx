import { StyleSheet, View } from "react-native";
import AssetDetails from "../../components/assets/AssetDetails";
import TabContent from "../../components/tabs/TabContent";
import BottomBarDetails from "../../components/bottom/BottomDetails";

export default function AssetDetailsScreen() {
  return (
    <View style={styles.container}>
      <AssetDetails>
        {({
          activeTab,
          setActiveTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
          TAB_ITEMS,
          nameClass,
          fieldActive,
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
                nameClass={nameClass || ""}
                fieldActive={fieldActive}
              />
            </View>

            <BottomBarDetails
              activeTab={activeTab}
              onTabPress={setActiveTab}
              tabs={TAB_ITEMS ?? []}
            />
          </>
        )}
      </AssetDetails>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  content: { flex: 1, paddingBottom: 60 },
});
