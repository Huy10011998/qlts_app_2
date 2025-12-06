import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Switch,
  Text,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { TypeProperty } from "../../utils/Enum";
import { DatePickerModalIOS } from "../modal/DatePickerModal";
import { RenderInputByTypeProps } from "../../types/Components.d";
import { parseLinkHtml } from "../../utils/Helper";
import IsLoading from "../ui/IconLoading";

export const RenderInputByType = ({
  f,
  formData,
  enumData,
  referenceData,
  images = {},
  loadingImages = {},
  handleChange,
  pickImage,
  setLoadingImages,
  setImages,
  styles,
  setModalVisible,
  setActiveEnumField,
  mode,
  getDefaultValueForField,
}: RenderInputByTypeProps) => {
  // INITIAL VALUE
  const value = formData[f.name];

  // Skip read-only fields entirely
  if (f.isReadOnly === true) {
    return null;
  }

  // APPLY DEFAULT FOR ADD MODE ONLY
  useEffect(() => {
    if (mode === "add" && !value && f.defaultDateNow) {
      const def = getDefaultValueForField(f);
      handleChange(f.name, def);
    }
  }, []);

  // LIST ITEMS (ENUM / REFERENCE)
  const items =
    f.typeProperty === TypeProperty.Reference
      ? referenceData[f.name] || []
      : enumData[f.name] || [];

  // SWITCH CASE
  switch (f.typeProperty) {
    // NUMBER
    case TypeProperty.Int:
    case TypeProperty.Decimal:
      return (
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(value ?? "")}
          placeholder={`Nhập ${f.moTa ?? f.name}`}
          placeholderTextColor="#888"
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );

    // BOOL
    case TypeProperty.Bool:
      return (
        <View style={styles.switchRow}>
          <Switch
            value={!!value}
            onValueChange={(v) => handleChange(f.name, v)}
          />
          <Text>{value ? "Có" : "Không"}</Text>
        </View>
      );

    // DATE
    case TypeProperty.Date:
      return (
        <DatePickerModalIOS
          value={value}
          onChange={(d) => handleChange(f.name, d)}
        />
      );

    // STRING
    case TypeProperty.String:
      return (
        <TextInput
          style={styles.input}
          multiline
          value={String(value ?? "")}
          placeholder={`Nhập ${f.moTa ?? f.name}`}
          placeholderTextColor="#888"
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );

    // TEXTAREA
    case TypeProperty.Text:
      return (
        <TextInput
          style={[styles.textArea, { textAlignVertical: "top" }]}
          multiline
          value={String(value ?? "")}
          placeholder={`Nhập ${f.moTa ?? f.name}`}
          placeholderTextColor="#888"
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );

    // IMAGE
    case TypeProperty.Image: {
      const imgUrl = images[f.name];
      const loading = loadingImages[f.name];

      return (
        <View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={async () => {
              setLoadingImages((p: any) => ({ ...p, [f.name]: true }));
              await pickImage(
                f.name,
                handleChange,
                setImages,
                setLoadingImages
              );
            }}
          >
            <Ionicons name="image-outline" size={22} color="#FF3333" />
            <Text style={{ marginLeft: 8, color: "#FF3333" }}>Chọn hình</Text>
          </TouchableOpacity>

          {loading ? (
            <IsLoading size="small" />
          ) : imgUrl ? (
            <View style={{ marginTop: 10 }}>
              <Image
                source={{ uri: imgUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />

              {/* nút X dùng chung */}
              <TouchableOpacity
                onPress={() => {
                  // Xóa preview hình
                  setImages((p: any) => ({ ...p, [f.name]: "" }));

                  // Gửi tín hiệu '---' để BE xóa ảnh
                  handleChange(f.name, "---");
                }}
                style={styles.removeImageButton}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      );
    }

    // LINK (ADD + EDIT)
    case TypeProperty.Link: {
      const parsed =
        mode === "edit" && value
          ? parseLinkHtml(String(value))
          : { url: "", text: "" };

      const [url, setUrl] = useState(parsed.url);
      const [label, setLabel] = useState(parsed.text);

      useEffect(() => {
        setUrl(parsed.url);
        setLabel(parsed.text);
      }, [parsed.url, parsed.text]);

      const buildHtml = (u: string, l: string) =>
        `<a href="${u}" target="_blank" rel="noopener noreferrer">${
          l || u
        }</a>`;

      return (
        <View style={{ gap: 10 }}>
          <TextInput
            style={styles.input}
            placeholder="Nhập đường link"
            placeholderTextColor="#888"
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              handleChange(f.name, buildHtml(t, label));
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Nhập label"
            placeholderTextColor="#888"
            value={label}
            onChangeText={(t) => {
              setLabel(t);
              handleChange(f.name, buildHtml(url, t));
            }}
          />

          {url ? (
            <TouchableOpacity onPress={() => Linking.openURL(url)}>
              <Text style={{ color: "blue" }}>{label || url}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    // ENUM / REFERENCE — HANDLE ADD + EDIT
    case TypeProperty.Enum:
    case TypeProperty.Reference:
      return (
        <TouchableOpacity
          key={value}
          onPress={() => {
            setActiveEnumField(f);
            setModalVisible(true);
          }}
        >
          <Text
            style={[
              {
                padding: 12,
                fontSize: 14,
                marginRight: 6,
                color:
                  value !== null && value !== undefined && value !== ""
                    ? "#000"
                    : "#999",
              },
              styles.input,
            ]}
          >
            {items.find((x: { value: any }) => x.value == value)?.text ??
              formData?.[`${f.name}_MoTa`] ??
              `Chọn ${f.moTa || f.name}`}
          </Text>

          <Ionicons
            name="chevron-down"
            size={20}
            color="#444"
            style={{ position: "absolute", right: 8, top: 12 }}
          />
        </TouchableOpacity>
      );

    // DEFAULT
    default:
      return (
        <TextInput
          style={styles.input}
          value={String(value ?? "")}
          placeholder={`Nhập ${f.moTa ?? f.name}`}
          placeholderTextColor="#888"
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );
  }
};
