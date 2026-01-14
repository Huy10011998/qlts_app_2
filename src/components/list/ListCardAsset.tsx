import React, { useEffect, useMemo, useState, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { CardItemProps } from "../../types";
import { TypeProperty } from "../../utils/Enum";
import { convertToResizePath, fetchImage } from "../../utils/Image";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { parseLink } from "../../utils/Link";

function ListCardAsset({
  item,
  fields = [],
  icon,
  onPress = () => {},
}: CardItemProps) {
  // chỉ lấy các field Image
  const imageFields = useMemo(
    () => fields.filter((f) => f.typeProperty === TypeProperty.Image),
    [fields]
  );

  const [images, setImages] = useState<Record<string, string>>({});
  const [, setLoadingImages] = useState<Record<string, boolean>>({});

  // Fetch ảnh 1 lần khi item thay đổi
  useEffect(() => {
    imageFields.forEach((field) => {
      const raw = getFieldValue(item, field);
      if (typeof raw !== "string" || raw === "---") return;

      const resizePath = convertToResizePath(raw);

      if (images[field.name]) return;

      fetchImage(field.name, resizePath, setLoadingImages, setImages);
    });
  }, [item, imageFields]);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      {/* AVATAR */}
      <View style={styles.avatar}>
        <Ionicons
          name={icon || "document-text-outline"}
          size={26}
          color="#FF3333"
        />
      </View>

      {/* INFO */}
      <View style={styles.info}>
        {fields.map((field) => {
          const rawValue = getFieldValue(item, field);
          const value =
            rawValue === null || rawValue === undefined
              ? "---"
              : String(rawValue);

          // IMAGE (giống code ban đầu)
          if (field.typeProperty === TypeProperty.Image) {
            const uri = images[field.name];
            return (
              <View key={field.name} style={styles.block}>
                <Text style={styles.label}>{field.moTa}:</Text>
                {uri ? (
                  <Image source={{ uri }} style={styles.bodyImage} />
                ) : (
                  <Text style={styles.text}>---</Text>
                )}
              </View>
            );
          }

          /** 🔗 LINK */
          if (field.typeProperty === TypeProperty.Link) {
            const parsed = parseLink(value);
            return (
              <Text key={field.name} style={styles.text}>
                <Text style={styles.label}>{field.moTa}: </Text>
                {parsed ? (
                  <Text
                    style={styles.link}
                    onPress={() => parsed.url && Linking.openURL(parsed.url)}
                  >
                    {parsed.text}
                  </Text>
                ) : (
                  value
                )}
              </Text>
            );
          }

          /** 🔤 TEXT */
          return (
            <Text key={field.name} style={styles.text}>
              <Text style={styles.label}>{field.moTa}: </Text>
              {value}
            </Text>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

export default memo(ListCardAsset);

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

  block: {
    marginBottom: 6,
  },

  bodyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 4,
    resizeMode: "cover",
  },

  text: {
    fontSize: 14,
    color: "#000",
    marginBottom: 2,
  },

  label: {
    fontWeight: "bold",
    color: "#000",
  },

  link: {
    color: "#1D4ED8",
    textDecorationLine: "underline",
  },
});
