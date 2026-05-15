import React, { useEffect, useMemo } from "react";
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
import { formatVND, unFormatVND } from "../../utils/helpers/number";
import IsLoading from "../ui/IconLoading";
import { parseLinkHtml } from "../../utils/Link";
import { DatePicker, TimePicker } from "../dataPicker/DataPicker";
import { log } from "../../utils/Logger";
import { C } from "../../utils/helpers/colors";

const localStyles = {
  inputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputRowInvalid: {
    borderColor: C.red,
    backgroundColor: "#FFF5F5",
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  prefix: {
    marginLeft: 8,
    color: "#333",
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: "top" as const,
    color: "#333",
  },
  imageButtonText: {
    marginLeft: 8,
    color: C.red,
  },
  imageWrap: {
    marginTop: 10,
  },
  linkWrap: {
    gap: 10,
  },
  inputText: {
    color: "#333",
  },
  linkText: {
    color: "blue",
  },
  selectText: {
    padding: 12,
    paddingRight: 20,
    fontSize: 14,
  },
  selectedValueText: {
    color: "#000",
  },
  placeholderValueText: {
    color: "#999",
  },
  chevron: {
    position: "absolute" as const,
    right: 8,
    top: 12,
  },
  selectInputInvalid: {
    borderColor: C.red,
    backgroundColor: "#FFF5F5",
  },
  textAreaInvalid: {
    borderColor: C.red,
    backgroundColor: "#FFF5F5",
  },
  fieldWrapInvalid: {
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 12,
    overflow: "hidden" as const,
    backgroundColor: "#FFF5F5",
  },
};

function LinkInputField({
  value,
  onChange,
  styles,
}: {
  value: unknown;
  onChange: (nextValue: string) => void;
  styles: RenderInputByTypeProps["styles"];
}) {
  const parsed = useMemo(() => parseLinkHtml(String(value ?? "")), [value]);
  const [url, setUrl] = React.useState(parsed.url);
  const [label, setLabel] = React.useState(parsed.text);

  useEffect(() => {
    setUrl(parsed.url);
    setLabel(parsed.text);
  }, [parsed.text, parsed.url]);

  const buildHtml = (nextUrl: string, nextLabel: string) =>
    `<a href="${nextUrl}" target="_blank" rel="noopener noreferrer">${
      nextLabel || nextUrl
    }</a>`;

  return (
    <View style={localStyles.linkWrap}>
      <TextInput
        style={[styles.input, localStyles.inputText]}
        placeholder="Nhập đường link"
        placeholderTextColor="#888"
        value={url}
        onChangeText={(nextUrl) => {
          setUrl(nextUrl);
          onChange(buildHtml(nextUrl, label));
        }}
      />
      <TextInput
        style={[styles.input, localStyles.inputText]}
        placeholder="Nhập label"
        placeholderTextColor="#888"
        value={label}
        onChangeText={(nextLabel) => {
          setLabel(nextLabel);
          onChange(buildHtml(url, nextLabel));
        }}
      />

      {url ? (
        <TouchableOpacity onPress={() => Linking.openURL(url)}>
          <Text style={localStyles.linkText}>{label || url}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const RenderInputByType = ({
  f,
  formData,
  enumData,
  referenceData,
  validationErrors = {},
  images = {},
  loadingImages = {},
  handleChange,
  pickImage,
  setLoadingImages,
  setImages,
  styles,
  mode,
  openEnumReferanceModal,
}: RenderInputByTypeProps) => {
  const value = formData[f.name];
  const hasValidationError = Boolean(validationErrors?.[f.name]);
  const items = useMemo(
    () =>
      f.typeProperty === TypeProperty.Reference
        ? referenceData[f.name]?.items || []
        : enumData[f.name] || [],
    [enumData, f.name, f.typeProperty, referenceData],
  );

  const hasValue =
    value !== null && value !== undefined && value !== "" && value !== 0;

  const normalizedValue = value == null ? "" : String(value);
  const selectedItem = useMemo(
    () =>
      Array.isArray(items)
        ? items.find((x: any) => String(x.value ?? "") === normalizedValue)
        : undefined,
    [items, normalizedValue],
  );

  const displayText = hasValue
    ? selectedItem?.text ?? formData?.[`${f.name}_MoTa`] ?? String(value)
    : `Chọn ${f.moTa || f.name}`;

  useEffect(() => {
    if (f.typeProperty !== TypeProperty.Reference || !f.parentsFields) return;

    log("[RenderInputByType] cascade reference display:", {
      fieldName: f.name,
      fieldMoTa: f.moTa,
      value,
      selectedItem,
      moTaValue: formData?.[`${f.name}_MoTa`],
      displayText,
      items,
    });
  }, [displayText, f, formData, items, selectedItem, value]);

  if (f.isReadOnly === true) {
    return null;
  }

  const renderBasicInput = ({
    keyboardType = "default",
  }: { keyboardType?: "default" | "numeric" } = {}) => (
    <View
      style={[
        localStyles.inputRow,
        hasValidationError && localStyles.inputRowInvalid,
      ]}
    >
      <TextInput
        style={localStyles.textInput}
        keyboardType={keyboardType}
        value={String(value ?? "")}
        placeholder={`Nhập ${f.moTa ?? f.name}`}
        placeholderTextColor="#888"
        onChangeText={(t) => handleChange(f.name, t)}
      />

      {f.prefix ? <Text style={localStyles.prefix}>{f.prefix}</Text> : null}
    </View>
  );

  switch (f.typeProperty) {
    case TypeProperty.Int:
    case TypeProperty.Decimal: {
      const formattedValue = formatVND(value);

      return (
        <View
          style={[
            localStyles.inputRow,
            hasValidationError && localStyles.inputRowInvalid,
          ]}
        >
          <TextInput
            style={localStyles.textInput}
            keyboardType="numeric"
            value={formattedValue}
            placeholder={`Nhập ${f.moTa ?? f.name}`}
            placeholderTextColor="#888"
            onChangeText={(text) => {
              const raw = unFormatVND(text);
              handleChange(f.name, raw);
            }}
          />

          {f.prefix ? <Text style={localStyles.prefix}>{f.prefix}</Text> : null}
        </View>
      );
    }

    case TypeProperty.Bool:
      return (
        <View style={styles.boolRow}>
          <View style={styles.boolLabel}>
            {f.tooltip && (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>Kiểm tra: </Text>
                <Text style={styles.tooltipText}>{f.tooltip}</Text>
              </View>
            )}
          </View>

          <Switch
            value={!!value}
            onValueChange={(v) => handleChange(f.name, v)}
            trackColor={{ false: "#888", true: C.red }}
            thumbColor={value ? "#ffffff" : "#f4f3f4"}
          />
        </View>
      );

    case TypeProperty.Date:
      return (
        <View style={hasValidationError ? localStyles.fieldWrapInvalid : undefined}>
          <DatePicker value={value} onChange={(d) => handleChange(f.name, d)} />
        </View>
      );

    case TypeProperty.Time:
      return (
        <View style={hasValidationError ? localStyles.fieldWrapInvalid : undefined}>
          <TimePicker value={value} onChange={(d) => handleChange(f.name, d)} />
        </View>
      );

    case TypeProperty.String:
      return renderBasicInput();

    case TypeProperty.Text:
      return (
        <TextInput
          style={[
            styles.textArea,
            localStyles.textArea,
            hasValidationError && localStyles.textAreaInvalid,
          ]}
          multiline
          value={String(value ?? "")}
          placeholder={`Nhập ${f.moTa ?? f.name}`}
          placeholderTextColor="#888"
          onChangeText={(t) => handleChange(f.name, t)}
        />
      );

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
                setLoadingImages,
              );
            }}
          >
            <Ionicons name="image-outline" size={22} color={C.red} />
            <Text style={localStyles.imageButtonText}>Chọn hình</Text>
          </TouchableOpacity>

          {loading ? (
            <IsLoading size="small" />
          ) : imgUrl ? (
            <View style={localStyles.imageWrap}>
              <Image
                source={{ uri: imgUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />

              <TouchableOpacity
                onPress={() => {
                  setImages((p: any) => ({ ...p, [f.name]: "" }));
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

    case TypeProperty.Link: {
      return (
        <LinkInputField
          value={(mode === "edit" || mode === "clone") && value ? value : ""}
          onChange={(nextValue) => handleChange(f.name, nextValue)}
          styles={styles}
        />
      );
    }

    case TypeProperty.Enum:
    case TypeProperty.Reference:
      return (
        <TouchableOpacity
          onPress={() => {
            openEnumReferanceModal?.(f);
          }}
        >
          <Text
            style={[
              styles.input,
              hasValidationError && localStyles.selectInputInvalid,
              localStyles.selectText,
              hasValue
                ? localStyles.selectedValueText
                : localStyles.placeholderValueText,
            ]}
          >
            {displayText}
          </Text>

          <Ionicons
            name="chevron-down"
            size={20}
            color="#444"
            style={localStyles.chevron}
          />
        </TouchableOpacity>
      );

    default:
      return renderBasicInput({ keyboardType: "numeric" });
  }
};
