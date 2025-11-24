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

export const RenderInputByType = ({
  f,
  formData,
  enumData,
  referenceData,
  images = {},
  loadingImages = {},
  handleChange,
  pickImage,
  setImages,
  styles,
  setModalVisible,
  setActiveEnumField,
  mode,
  getDefaultValueForField,
}: RenderInputByTypeProps) => {
  // INITIAL VALUE
  const value = formData[f.name];

  // ★ APPLY DEFAULT FOR ADD MODE ONLY
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

    // TEXT
    case TypeProperty.Text:
      return (
        <TextInput
          style={styles.textArea}
          multiline
          value={String(value ?? "")}
          placeholder={`Nhập ${f.moTa ?? f.name}`}
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );

    // IMAGE
    case TypeProperty.Image: {
      const img = images[f.name];
      const loading = loadingImages[f.name];

      const removeImage = () => {
        setImages?.((p: any) => ({ ...p, [f.name]: "" }));
        handleChange(f.name, "");
      };

      return (
        <View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage(f.name, handleChange, setImages)}
          >
            <Ionicons name="image-outline" size={22} color="#FF3333" />
            <Text style={{ marginLeft: 8, color: "#FF3333" }}>Chọn hình</Text>
          </TouchableOpacity>

          {loading ? (
            <Text>Đang tải...</Text>
          ) : img ? (
            <View style={{ marginTop: 10 }}>
              <Image source={{ uri: img }} style={styles.previewImage} />
              <TouchableOpacity
                onPress={removeImage}
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

      const buildHtml = (u: string, l: string) =>
        `<a href="${u}" target="_blank" rel="noopener noreferrer">${
          l || u
        }</a>`;

      return (
        <View style={{ gap: 10 }}>
          <TextInput
            style={styles.input}
            placeholder="Nhập đường link"
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              handleChange(f.name, buildHtml(t, label));
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Nhập label"
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
          style={styles.pickerWrapper}
          onPress={() => {
            setActiveEnumField(f);
            setModalVisible(true);
          }}
        >
          <Text
            style={{
              padding: 12,
              fontSize: 14,
              color:
                value !== null && value !== undefined && value !== ""
                  ? "#000"
                  : "#999",
            }}
          >
            {items.find((x: { value: any }) => x.value == value)?.text ??
              (value != null ? formData?.[`${f.name}_MoTa`] : null) ??
              (value && typeof value === "string"
                ? value
                : `Chọn ${f.moTa || f.name}`)}
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
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );
  }
};
