import { StyleSheet, View } from "react-native";
import TabContent from "../../components/tabs/TabContent";
import QrDetails from "../../components/qrcode/QrDetails";

export default function QrDetailsScreen() {
  return (
    <View style={styles.container}>
      <QrDetails>
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
      </QrDetails>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  content: { flex: 1, paddingBottom: 60 },
});
