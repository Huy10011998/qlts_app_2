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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { GroupListProps } from "../../types";
import { TypeProperty } from "../../utils/Enum";
import { getPreviewAttachProperty } from "../../services/data/CallApi";
import { getMimeType, parseLink } from "../../utils/Helper";
import IsLoading from "../ui/IconLoading";

export default function AssetGroupList({
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  previousItem,
  isFieldChanged,
}: GroupListProps) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  );

  // state cho modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // tải ảnh theo field
  const fetchImage = async (fieldName: string, path: string) => {
    try {
      if (!path || path.trim() === "--") return;

      setLoadingImages((prev) => ({ ...prev, [fieldName]: true }));

      const res = await getPreviewAttachProperty(path);
      const mimeType = getMimeType(path);

      setImages((prev) => ({
        ...prev,
        [fieldName]: `data:${mimeType};base64,${res.data}`,
      }));
    } catch (error) {
      console.error("Error fetching image:", error);
    } finally {
      setLoadingImages((prev) => ({ ...prev, [fieldName]: false }));
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
          fetchImage(field.name, value);
        }
      });
    });
  }, [item]);

  // PanResponder cho vuốt xuống
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
      {Object.entries(groupedFields).map(([groupName, fields]) => {
        const isCollapsed = collapsedGroups[groupName];
        return (
          <View key={groupName} style={styles.groupCard}>
            {/* Group Header */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleGroup(groupName)}
              activeOpacity={0.7}
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
                      // Case Link
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
                      // Case mặc định (text)
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
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer} {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
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
