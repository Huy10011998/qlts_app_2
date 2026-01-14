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
import { RenderInputByTypeProps } from "../../types/Components.d";
import { formatVND, unFormatVND } from "../../utils/Helper";
import IsLoading from "../ui/IconLoading";
import { parseLinkHtml } from "../../utils/Link";
import { DatePicker, TimePicker } from "../dataPicker/DataPicker";

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

  // LIST ITEMS (ENUM / REFERENCE)
  const items =
    f.typeProperty === TypeProperty.Reference
      ? referenceData[f.name] || []
      : enumData[f.name] || [];

  const hasValue =
    value !== null && value !== undefined && value !== "" && value !== 0;

  const selectedItem = items.find((x: any) => x.value == value);

  const displayText = hasValue
    ? selectedItem?.text ?? formData?.[`${f.name}_MoTa`] ?? String(value)
    : `Chọn ${f.moTa || f.name}`;

  const renderBasicInput = ({
    keyboardType = "default",
  }: { keyboardType?: "default" | "numeric" } = {}) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 12,
      }}
    >
      <TextInput
        style={{
          flex: 1,
          paddingVertical: 12,
          fontSize: 14,
          color: "#333",
        }}
        keyboardType={keyboardType}
        value={String(value ?? "")}
        placeholder={`Nhập ${f.moTa ?? f.name}`}
        placeholderTextColor="#888"
        onChangeText={(t) => handleChange(f.name, t)}
      />

      {f.prefix ? (
        <Text style={{ marginLeft: 8, color: "#333", fontSize: 14 }}>
          {f.prefix}
        </Text>
      ) : null}
    </View>
  );

  // SWITCH CASE
  switch (f.typeProperty) {
    // NUMBER
    case TypeProperty.Int:
    case TypeProperty.Decimal: {
      const formattedValue = formatVND(value);

      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 12,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 14,
              color: "#333",
            }}
            keyboardType="numeric"
            value={formattedValue}
            placeholder={`Nhập ${f.moTa ?? f.name}`}
            placeholderTextColor="#888"
            onChangeText={(text) => {
              const raw = unFormatVND(text);
              handleChange(f.name, raw);
            }}
          />

          {f.prefix ? (
            <Text style={{ marginLeft: 8, color: "#333", fontSize: 14 }}>
              {f.prefix}
            </Text>
          ) : null}
        </View>
      );
    }

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
        <DatePicker value={value} onChange={(d) => handleChange(f.name, d)} />
      );

    // TIME
    case TypeProperty.Time:
      return (
        <TimePicker value={value} onChange={(d) => handleChange(f.name, d)} />
      );

    // STRING
    case TypeProperty.String:
      return renderBasicInput();

    // TEXTAREA
    case TypeProperty.Text:
      return (
        <TextInput
          style={[styles.textArea, { textAlignVertical: "top", color: "#333" }]}
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
        (mode === "edit" || mode === "clone") && value
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
            style={[styles.input, { color: "#333" }]}
            placeholder="Nhập đường link"
            placeholderTextColor="#888"
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              handleChange(f.name, buildHtml(t, label));
            }}
          />
          <TextInput
            style={[styles.input, { color: "#333" }]}
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
          onPress={() => {
            setActiveEnumField(f);
            setModalVisible(true);
          }}
        >
          <Text
            style={[
              styles.input,
              {
                padding: 12,
                paddingRight: 20,
                fontSize: 14,
                color: hasValue ? "#000" : "#999",
              },
            ]}
          >
            {displayText}
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
      return renderBasicInput({ keyboardType: "numeric" });
  }
};
