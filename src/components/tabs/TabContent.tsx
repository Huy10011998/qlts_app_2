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

  /* ACTION HANDLERS */
  const handleDelete = async () => {
    if (!item?.id) return;

    try {
      const body = { iDs: [item.id] };

      // Check Reference trước
      const res = await checkReferenceUsage(nameClass || "", body.iDs);
      const refList = res?.data;

      // Nếu bị tham chiếu → báo lỗi, KHÔNG hỏi confirm delete
      if (Array.isArray(refList) && refList.length > 0) {
        const refMessage = refList.map((e) => `• ${e.message}`).join("\n");

        Alert.alert(
          "Không thể xóa tài sản",
          `Tài sản đang được tham chiếu tại:\n\n${refMessage}`,
        );
        return;
      }

      //  Nếu KHÔNG bị tham chiếu → hỏi lại người dùng có muốn xóa không
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
      Alert.alert("Lỗi", "Không thể kiểm tra dữ liệu tham chiếu!");
    }
  };

  const confirmDelete = async () => {
    try {
      const deleteBody = {
        iDs: [item.id],
        saveHistory: true,
      };

      await deleteItems(nameClass || "", deleteBody);

      Alert.alert("Thành công", "Đã xoá tài sản!", [
        {
          text: "OK",
          onPress: () => {
            dispatch(setShouldRefreshList(true));
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể xoá tài sản!");
    }
  };

  const onPressNavigateToEdit = (item: Record<string, any>) => {
    try {
      navigation.navigate("AssetEditItem", {
        item,
        nameClass,
        field: JSON.stringify(fieldActive ?? []),
      });
    } catch (err) {
      error(err);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  const onPressNavigateToClone = (item: Record<string, any>) => {
    try {
      navigation.navigate("AssetCloneItem", {
        item,
        nameClass,
        propertyClass,
        field: JSON.stringify(fieldActive ?? []),
      });
    } catch (err) {
      error(err);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  /* TAB CONTENT */
  const tabContentMap: Record<string, JSX.Element> = {
    list: (
      <View style={{ flex: 1 }}>
        {isDetailsScreen && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <AssetActions
              onEdit={() => onPressNavigateToEdit(item)}
              onDelete={handleDelete}
              onClone={() => onPressNavigateToClone(item)}
              nameClass={nameClass}
            />
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
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
