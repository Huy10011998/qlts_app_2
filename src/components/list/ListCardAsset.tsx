import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getFieldValue, parseLink } from "../../utils/Helper";
import { CardItemProps } from "../../types";
import { TypeProperty } from "../../utils/Enum";
import IsLoading from "../ui/IconLoading";
import { convertToResizePath, fetchImage } from "../../utils/Image";

export default function ListCardAsset({
  item,
  fields = [],
  icon,
  onPress = () => {},
}: CardItemProps) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch ảnh cho các field type Image
  useEffect(() => {
    fields.forEach((field) => {
      const value = getFieldValue(item, field);

      if (
        field.typeProperty === TypeProperty.Image &&
        typeof value === "string" &&
        value !== "---"
      ) {
        // Convert path sang Resize trước khi fetch
        const resizePath = convertToResizePath(value);

        fetchImage(field.name, resizePath, setLoadingImages, setImages);
      }
    });
  }, [item, fields]);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.avatar}>
        <Ionicons
          name={icon || "document-text-outline"}
          size={26}
          color="#FF3333"
        />
      </View>

      <View style={styles.info}>
        {fields.map((field) => {
          const rawValue = getFieldValue(item, field);

          const currentValue =
            rawValue === null || rawValue === undefined
              ? "---"
              : String(rawValue);

          // IMAGE
          if (field.typeProperty === TypeProperty.Image) {
            return (
              <View key={field.name} style={{ marginBottom: 6 }}>
                <Text style={styles.label}>{field.moTa}: </Text>

                {loadingImages[field.name] ? (
                  <IsLoading size="small" />
                ) : images[field.name] ? (
                  <Image
                    source={{ uri: images[field.name] }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 6,
                      marginTop: 4,
                      resizeMode: "cover",
                    }}
                  />
                ) : (
                  <Text style={styles.text}>---</Text>
                )}
              </View>
            );
          }

          // LINK
          if (field.typeProperty === TypeProperty.Link) {
            return (
              <View key={field.name} style={{ marginBottom: 6 }}>
                <Text style={styles.label}>{field.moTa}: </Text>
                {currentValue !== "---" ? (
                  (() => {
                    const parsed = parseLink(currentValue);
                    return parsed ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(parsed.url)}
                      >
                        <Text style={[styles.text, styles.link]}>
                          {parsed.text}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.text}>{currentValue}</Text>
                    );
                  })()
                ) : (
                  <Text style={styles.text}>---</Text>
                )}
              </View>
            );
          }

          // 🔤 NORMAL TEXT
          return (
            <Text key={field.name} style={styles.text}>
              <Text style={styles.label}>{field.moTa}: </Text>
              {currentValue}
            </Text>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    elevation: 3,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  info: { flex: 1 },
  text: { fontSize: 14, color: "#000", marginBottom: 2 },
  label: { fontWeight: "bold", color: "#000" },
  link: { color: "#1D4ED8", textDecorationLine: "underline" },
});
