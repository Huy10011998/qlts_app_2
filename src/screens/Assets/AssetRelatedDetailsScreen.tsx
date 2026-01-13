import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

import AssetDetails from "../../components/assets/AssetDetails";
import TabContent from "../../components/tabs/TabContent";

import { useAppDispatch } from "../../store/Hooks";
import { reloadPermissions } from "../../store/PermissionActions";

export default function AssetDetailsScreen() {
  const dispatch = useAppDispatch();

  // reload permission mỗi lần quay lại màn
  useFocusEffect(
    useCallback(() => {
      dispatch(reloadPermissions());
    }, [dispatch])
  );

  return (
    <View style={styles.container}>
      <AssetDetails>
        {({
          activeTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
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
          </>
        )}
      </AssetDetails>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  content: { flex: 1 },
});
