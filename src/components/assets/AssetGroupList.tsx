import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  PanResponder,
  Linking,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AssetEditItemNavigationProp, GroupListProps } from "../../types";
import { TypeProperty } from "../../utils/Enum";
import { checkReferenceUsage, deleteItems } from "../../services/data/CallApi";
import { parseLink } from "../../utils/Helper";
import IsLoading from "../ui/IconLoading";
import { useParams } from "../../hooks/useParams";
import { useNavigation, useRoute } from "@react-navigation/native";
import { error } from "../../utils/Logger";
import { fetchImage } from "../../utils/Image";
import AssetDeleteAndEdit from "./AssetDeleteAndEdit";

export default function AssetGroupList({
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  previousItem,
  isFieldChanged,
  nameClass,
  fieldActive,
  onReload,
}: GroupListProps) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  );

  const route = useRoute();

  const detailScreens = ["AssetDetails", "QrDetails"];

  const isDetailsScreen = detailScreens.includes(route.name);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { onCreated } = useParams();
  const navigation = useNavigation<AssetEditItemNavigationProp>();

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
          `Tài sản đang được tham chiếu tại:\n\n${refMessage}`
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
        { cancelable: true }
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
            if (onCreated) onCreated();
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
        onReload,
      });
    } catch (err) {
      error(err);
      Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
    }
  };

  useEffect(() => {
    Object.entries(groupedFields).forEach(([_, fields]) => {
      fields.forEach((field) => {
        const value = getFieldValue(item, field);
        if (
          field.typeProperty === TypeProperty.Image &&
          value &&
          value !== "---"
        ) {
          fetchImage(field.name, value, setLoadingImages, setImages);
        }
      });
    });
  }, [item]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        setModalVisible(false);
      }
    },
  });

  return (
    <>
      {isDetailsScreen && (
        <AssetDeleteAndEdit
          onEdit={() => onPressNavigateToEdit(item)}
          onDelete={handleDelete}
        />
      )}

      {Object.entries(groupedFields).map(([groupName, fields]) => {
        const isCollapsed = collapsedGroups[groupName];

        return (
          <View key={groupName} style={styles.groupCard}>
            {/* Group Header */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleGroup(groupName)}
            >
              <Text style={styles.groupTitle}>{groupName}</Text>
              <Ionicons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={26}
                color="#222"
              />
            </TouchableOpacity>

            {/* Group Fields */}
            {!isCollapsed &&
              fields.map((field) => {
                const currentValue = getFieldValue(item, field) || "---";
                const prevValue =
                  previousItem && getFieldValue(previousItem, field);

                const changed =
                  isFieldChanged && previousItem
                    ? isFieldChanged(field, item, previousItem)
                    : false;

                return (
                  <View key={field.name} style={styles.fieldRow}>
                    <Text style={styles.label}>{field.moTa}: </Text>

                    {/* Case Image */}
                    {field.typeProperty === TypeProperty.Image ? (
                      currentValue !== "---" ? (
                        loadingImages[field.name] ? (
                          <IsLoading size="small" />
                        ) : images[field.name] ? (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedImage(images[field.name]);
                              setModalVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: images[field.name] }}
                              style={styles.image}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.value}>---</Text>
                        )
                      ) : (
                        <Text style={styles.value}>---</Text>
                      )
                    ) : field.typeProperty === TypeProperty.Link ? (
                      currentValue !== "---" ? (
                        (() => {
                          const parsed = parseLink(currentValue);
                          return parsed ? (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(parsed.url)}
                            >
                              <Text style={[styles.value, styles.link]}>
                                {parsed.text}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.value}>{currentValue}</Text>
                          );
                        })()
                      ) : (
                        <Text style={styles.value}>---</Text>
                      )
                    ) : (
                      <Text
                        style={[
                          styles.value,
                          changed && { color: "red", fontWeight: "600" },
                        ]}
                      >
                        {changed
                          ? `${prevValue || "---"}  ->  ${
                              currentValue || "---"
                            }`
                          : currentValue}
                      </Text>
                    )}
                  </View>
                );
              })}
          </View>
        );
      })}

      {/* Modal xem ảnh full */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer} {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={36} color="#fff" />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 12,
  },

  groupTitle: { fontSize: 16, fontWeight: "700", color: "#FF3333" },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },

  label: {
    fontWeight: "600",
    color: "#000",
    fontSize: 14,
    marginRight: 6,
  },

  value: {
    fontSize: 14,
    color: "#000",
    flexShrink: 1,
  },

  link: {
    color: "blue",
    textDecorationLine: "underline",
  },

  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  fullImage: {
    width: "90%",
    height: "80%",
  },

  closeButton: {
    position: "absolute",
    top: 60,
    right: 5,
    zIndex: 10,
    padding: 8,
  },
});
