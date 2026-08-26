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
import type { GroupListProps } from "../../types";
import { TypeProperty } from "../../utils/Enum";
import IsLoading from "../ui/IconLoading";
import { fetchImage } from "../../utils/Image";
import { parseLink } from "../../utils/Link";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

export default function AssetGroupList({
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  previousItem,
  isFieldChanged,
}: GroupListProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    Object.entries(groupedFields).forEach(([_, fields]) => {
      fields.forEach((field) => {
        const value = getFieldValue(item, field);
        if (
          field.typeProperty === TypeProperty.Image &&
          typeof value === "string" &&
          value !== "---"
        ) {
          fetchImage(field.name, value, setLoadingImages, setImages);
        }
      });
    });
  }, [getFieldValue, groupedFields, item]);

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
            <TouchableOpacity
              style={[
                styles.groupHeader,
                !isCollapsed && styles.groupHeaderOpen,
              ]}
              onPress={() => toggleGroup(groupName)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={groupName}
            >
              <View style={styles.groupTitleWrap}>
                <View style={styles.groupBullet} />
                <Text style={styles.groupTitle}>{groupName}</Text>
              </View>

              {/* Số trường trong nhóm: nhóm đang gập lại vẫn biết bên trong có gì. */}
              <Text style={styles.groupCount}>{fields.length}</Text>

              <View style={styles.groupChevron}>
                <Ionicons
                  name={isCollapsed ? "chevron-down" : "chevron-up"}
                  size={16}
                  color={c.red}
                />
              </View>
            </TouchableOpacity>

            {!isCollapsed &&
              fields.map((field, fieldIndex) => {
                const currentValue = getFieldValue(item, field) || "---";
                const prevValue =
                  (previousItem && getFieldValue(previousItem, field)) || "---";

                const changed =
                  isFieldChanged && previousItem
                    ? isFieldChanged(field, item, previousItem)
                    : false;

                const isEmpty = currentValue === "---";
                const isLast = fieldIndex === fields.length - 1;

                return (
                  <View
                    key={field.name}
                    style={[styles.fieldRow, !isLast && styles.fieldDivider]}
                  >
                    {/* Nhãn trên, giá trị dưới: nhãn tiếng Việt hay dài, để cùng
                        một dòng thì chữ bị ngắt lung tung, mỗi dòng lệch một kiểu. */}
                    <Text style={styles.label}>{field.moTa}</Text>

                    {field.typeProperty === TypeProperty.Image ? (
                      currentValue !== "---" ? (
                        loadingImages[field.name] ? (
                          <View style={styles.imageLoading}>
                            <IsLoading size="small" />
                          </View>
                        ) : images[field.name] ? (
                          <TouchableOpacity
                            style={styles.imageWrap}
                            onPress={() => {
                              setSelectedImage(images[field.name]);
                              setModalVisible(true);
                            }}
                            activeOpacity={0.9}
                            accessibilityRole="imagebutton"
                            accessibilityLabel={`Xem ${field.moTa}`}
                          >
                            <Image
                              source={{ uri: images[field.name] }}
                              style={styles.image}
                              resizeMode="cover"
                            />

                            {/* Không phải ai cũng đoán được ảnh bấm vào xem to được. */}
                            <View style={styles.imageZoomHint}>
                              <Ionicons
                                name="expand-outline"
                                size={14}
                                color="#fff"
                              />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <Text style={[styles.value, styles.emptyValue]}>
                            ---
                          </Text>
                        )
                      ) : (
                        <Text style={[styles.value, styles.emptyValue]}>---</Text>
                      )
                    ) : field.typeProperty === TypeProperty.Link ? (
                      (() => {
                        const prevValueText = String(prevValue);
                        const currentValueText = String(currentValue);
                        const prevParsed = parseLink(prevValueText);
                        const currentParsed =
                          currentValueText !== "---"
                            ? parseLink(currentValueText)
                            : null;

                        return (
                          <Text
                            style={[
                              styles.value,
                              changed && styles.changedValue,
                            ]}
                          >
                            {changed && (
                              <Text>
                                {prevParsed?.text || prevValueText || "---"}{" "}
                                {" -> "}
                              </Text>
                            )}

                            {currentParsed ? (
                              <Text
                                style={styles.link}
                                onPress={() =>
                                  Linking.openURL(currentParsed.url)
                                }
                              >
                                {currentParsed.text}
                              </Text>
                            ) : (
                              <Text style={styles.emptyValue}>---</Text>
                            )}
                          </Text>
                        );
                      })()
                    ) : (
                      <Text
                        style={[
                          styles.value,
                          isEmpty && !changed && styles.emptyValue,
                          changed && styles.changedValue,
                        ]}
                      >
                        {changed
                          ? `${prevValue}  ->  ${currentValue}`
                          : currentValue}
                      </Text>
                    )}
                  </View>
                );
              })}
          </View>
        );
      })}

      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    groupCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },

    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },

    groupHeaderOpen: {
      paddingBottom: 12,
      marginBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },

    groupTitleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    groupBullet: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: c.red,
    },

    groupTitle: { flex: 1, fontSize: 15.5, fontWeight: "700", color: c.red },

    groupCount: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      minWidth: 18,
      textAlign: "right",
    },

    groupChevron: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
    },

    fieldRow: {
      paddingVertical: 9,
    },

    fieldDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },

    label: {
      fontWeight: "600",
      color: c.textMuted,
      fontSize: 11.5,
      letterSpacing: 0.2,
      marginBottom: 3,
    },

    value: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },

    emptyValue: {
      color: c.textMuted,
    },

    changedValue: {
      color: c.red,
      fontWeight: "600",
    },

    link: {
      color: c.blue,
      textDecorationLine: "underline",
    },

    imageWrap: {
      marginTop: 4,
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },

    image: {
      width: "100%",
      height: "100%",
    },

    imageZoomHint: {
      position: "absolute",
      right: 8,
      bottom: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(17,24,39,0.6)",
    },

    imageLoading: {
      marginTop: 4,
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
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
