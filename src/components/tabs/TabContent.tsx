import React, { JSX } from "react";
import { ScrollView, View, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import { TabContentProps, AssetDetailsNavigationProp } from "../../types";
import AssetActions from "../assets/AssetActions";
import AssetGroupList from "../assets/AssetGroupList";
import { checkReferenceUsage, deleteItems } from "../../services/data/CallApi";
import { setShouldRefreshList } from "../../store/AssetSlice";
import { error } from "../../utils/Logger";
import AssetListAttachFile from "../assets/AssetAttachFile";
import AssetDeTailsTab from "../assets/AssetDetailsTab";
import AssetListHistory from "../assets/AssetListHistory";
import AssetNoteDetails from "../assets/AssetNoteDetails";
import { useParams } from "../../hooks/useParams";
import { useSafeAlert } from "../../hooks/useSafeAlert";

const styles = {
  container: {
    flex: 1,
  },
  actionsWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
};

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
  const route = useRoute();
  const navigation = useNavigation<AssetDetailsNavigationProp>();
  const dispatch = useDispatch();

  const detailScreens = ["AssetDetails", "QrDetails", "AssetRelatedDetails"];
  const isDetailsScreen = detailScreens.includes(route.name);

  const { propertyClass } = useParams();
  const nameClassRoot = nameClass;
  const { showAlertIfActive } = useSafeAlert();

  const handleDelete = async () => {
    if (!item?.id) return;

    try {
      const body = { iDs: [item.id] };
      const res = await checkReferenceUsage(nameClass || "", body.iDs);
      const refList = res?.data;
      if (Array.isArray(refList) && refList.length > 0) {
        const refMessage = refList.map((e) => `• ${e.message}`).join("\n");

        showAlertIfActive(
          "Không thể xóa tài sản",
          `Tài sản đang được tham chiếu tại:\n\n${refMessage}`,
        );
        return;
      }
      Alert.alert(
        "Xác nhận xoá",
        "Bạn có chắc chắn muốn xoá tài sản này?",
        [
          {
            text: "Huỷ",
            style: "cancel",
          },
          {
            text: "Xóa",
            style: "destructive",
            onPress: () => confirmDelete(),
          },
        ],
        { cancelable: true },
      );
    } catch (err) {
      showAlertIfActive("Lỗi", "Không thể kiểm tra dữ liệu tham chiếu!");
    }
  };

  const confirmDelete = async () => {
    try {
      const deleteBody = {
        iDs: [item.id],
        saveHistory: true,
      };

      await deleteItems(nameClass || "", deleteBody);

      showAlertIfActive("Thành công", "Đã xoá tài sản!", [
        {
          text: "OK",
          onPress: () => {
            dispatch(setShouldRefreshList(true));
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      showAlertIfActive("Lỗi", "Không thể xoá tài sản!");
    }
  };

  const onPressNavigateToEdit = (selectedItem: Record<string, any>) => {
    try {
      navigation.navigate("AssetEditItem", {
        item: selectedItem,
        nameClass,
        field: JSON.stringify(fieldActive ?? []),
      });
    } catch (err) {
      error(err);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  const onPressNavigateToClone = (selectedItem: Record<string, any>) => {
    try {
      const relatedRouteParams =
        route.name === "AssetRelatedDetails"
          ? (route.params as {
              idRoot?: string;
              propertyReference?: string;
              nameClassRoot?: string;
              titleHeader?: string;
            } | undefined)
          : undefined;

      navigation.navigate("AssetCloneItem", {
        item: selectedItem,
        nameClass,
        propertyClass,
        field: JSON.stringify(fieldActive ?? []),
        returnTo:
          route.name === "AssetRelatedDetails"
            ? "assetRelatedList"
            : "assetList",
        idRoot: relatedRouteParams?.idRoot,
        propertyReference: relatedRouteParams?.propertyReference,
        nameClassRoot: relatedRouteParams?.nameClassRoot,
        titleHeader: relatedRouteParams?.titleHeader,
      });
    } catch (err) {
      error(err);
      showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  const tabContentMap: Record<string, JSX.Element> = {
    list: (
      <View style={styles.container}>
        {isDetailsScreen && (
          <View style={styles.actionsWrap}>
            <AssetActions
              onEdit={() => onPressNavigateToEdit(item)}
              onDelete={handleDelete}
              onClone={() => onPressNavigateToClone(item)}
              nameClass={nameClass}
            />
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
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
      </View>
    ),

    details: <AssetDeTailsTab nameClassRoot={nameClassRoot} />,
    notes: <AssetNoteDetails text={item?.notes ?? "---"} />,
    history: <AssetListHistory />,
    attach: <AssetListAttachFile />,
  };

  return tabContentMap[activeTab] || null;
}
