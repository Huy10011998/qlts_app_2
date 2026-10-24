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
import QRCode from "react-native-qrcode-svg";
import type { CardItemProps, Field } from "../../types";
import { TypeProperty } from "../../utils/Enum";
import { convertToResizePath, fetchImage } from "../../utils/Image";
import { getFieldValue } from "../../utils/fields/GetFieldValue";
import { parseLink } from "../../utils/Link";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { normalizeIconImageUri } from "../../utils/iconImage";
import { getComputedQrUrl } from "../../utils/imageBase64";
import Base64ImageThumb from "../ui/Base64ImageThumb";
import PropertyImageThumb from "../ui/PropertyImageThumb";
import { isMediaField } from "./listCardShape";

/** Cạnh ô ảnh / QR ở cột phải. */
const MEDIA_SIZE = 72;

/** `getFieldValue` trả "---" (Int lỗi thì "--") khi không có giá trị. */
const isEmptyValue = (value: string) =>
  value.trim() === "" || value === "---" || value === "--";

function ListCardAsset({
  item,
  fields = [],
  icon,
  onPress = () => {},
}: CardItemProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const iconImageUri = normalizeIconImageUri(icon);
  const imageFields = useMemo(
    () => fields.filter((f) => f.typeProperty === TypeProperty.Image),
    [fields],
  );

  const [images, setImages] = useState<Record<string, string>>({});
  // Có key là đã gọi API cho field đó; `false` mà không có ảnh là tải lỗi.
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    imageFields.forEach((field) => {
      const raw = getFieldValue(item, field);
      if (typeof raw !== "string" || raw === "---") return;

      const resizePath = convertToResizePath(raw);

      // Đã thử rồi thì thôi: ảnh lỗi không bị gọi lại mỗi lần ảnh khác về.
      if (images[field.name] || field.name in loadingImages) return;

      fetchImage(field.name, resizePath, setLoadingImages, setImages);
    });
  }, [imageFields, images, loadingImages, item]);

  const renderMedia = (field: Field) => {
    const rawValue = getFieldValue(item, field);
    let thumb: React.ReactNode;

    if (field.typeProperty === TypeProperty.Image) {
      const uri = images[field.name];
      // Không có ảnh hoặc tải lỗi thì ẩn ô; đang tải thì giữ chỗ để thẻ khỏi
      // nhảy.
      if (
        !uri &&
        (typeof rawValue !== "string" ||
          isEmptyValue(rawValue) ||
          loadingImages[field.name] === false)
      )
        return null;

      thumb = uri ? (
        <PropertyImageThumb
          uri={uri}
          originalPath={String(rawValue)}
          style={styles.mediaImage}
          accessibilityLabel={`Xem ${field.moTa}`}
        />
      ) : (
        <View style={[styles.mediaImage, styles.mediaEmpty]}>
          <Ionicons name="image-outline" size={30} color={c.textMuted} />
        </View>
      );
    } else {
      /* Ảnh nằm sẵn trong dòng, không gọi API. Field tính sẵn của web
         (QRCode) không có giá trị thì tự sinh từ `qrUrl`, không có nữa
         thì ẩn ô. */
      const qrUrl = getComputedQrUrl(item, field, rawValue);
      if (rawValue === "---" && !qrUrl) return null;

      thumb = qrUrl ? (
        <QRCode value={qrUrl} size={MEDIA_SIZE} ecl="M" />
      ) : (
        <Base64ImageThumb
          value={rawValue === "---" ? null : String(rawValue)}
          size={MEDIA_SIZE}
          accessibilityLabel={`Xem ${field.moTa}`}
        />
      );
    }

    return (
      <View key={field.name} style={styles.mediaItem}>
        {thumb}
        <Text style={styles.mediaLabel} numberOfLines={2}>
          {field.moTa}
        </Text>
      </View>
    );
  };

  // Ảnh và QR gom sang cột phải, chữ chiếm phần còn lại bên trái — để chung
  // một cột thì thẻ dài gấp đôi.
  const media = fields.filter(isMediaField).map(renderMedia).filter(Boolean);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      {/* Icon giống nhau trên mọi thẻ của một danh sách; đã có cột ảnh bên
          phải thì nhường chỗ cho chữ. */}
      {media.length === 0 && (
        <View style={styles.avatar}>
          {iconImageUri ? (
            <Image source={{ uri: iconImageUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons
              name={icon || "document-text-outline"}
              size={26}
              color={c.red}
            />
          )}
        </View>
      )}

      <View style={styles.info}>
        {fields.map((field) => {
          if (isMediaField(field)) return null;

          const rawValue = getFieldValue(item, field);
          const value =
            rawValue === null || rawValue === undefined
              ? "---"
              : String(rawValue);

          // Thẻ danh sách để lướt tìm: dòng trống bỏ đi, vào chi tiết vẫn đủ.
          if (isEmptyValue(value)) return null;

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

          return (
            <Text key={field.name} style={styles.text}>
              <Text style={styles.label}>{field.moTa}: </Text>
              {value}
            </Text>
          );
        })}
      </View>

      {media.length > 0 && <View style={styles.media}>{media}</View>}
    </TouchableOpacity>
  );
}

export default memo(ListCardAsset);

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      backgroundColor: c.surface,
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
      backgroundColor: c.blueSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    avatarImage: {
      width: 30,
      height: 30,
      resizeMode: "contain",
    },

    info: { flex: 1 },

    media: {
      width: MEDIA_SIZE,
      marginLeft: 12,
      gap: 10,
    },

    mediaItem: { alignItems: "center" },

    mediaImage: {
      width: MEDIA_SIZE,
      height: MEDIA_SIZE,
      borderRadius: 10,
      resizeMode: "cover",
    },

    // Cùng dáng ô trống của `Base64ImageThumb`.
    mediaEmpty: {
      backgroundColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    mediaLabel: {
      marginTop: 4,
      fontSize: 12,
      color: c.textSub,
      textAlign: "center",
    },

    // Nhãn đậm nhưng màu nhạt để giá trị vẫn nổi hơn.
    text: {
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
      marginBottom: 2,
    },

    label: {
      fontSize: 14,
      fontWeight: "bold",
      color: c.textSecondary,
    },

    link: {
      // Màu chủ đề thay vì xanh đậm cố định: #1D4ED8 gần như chìm trên nền thẻ
      // tối.
      color: c.blue,
      textDecorationLine: "underline",
    },
  });
