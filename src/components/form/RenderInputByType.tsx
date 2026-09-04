import React, { useEffect, useMemo } from "react";
import {
  View,
  TextInput,
  Switch,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { TypeProperty } from "../../utils/Enum";
import type { RenderInputByTypeProps } from "../../types/components.d";
import { formatVND, unFormatVND } from "../../utils/helpers/number";
import IsLoading from "../ui/IconLoading";
import { parseLinkHtml } from "../../utils/Link";
import { DatePicker, TimePicker } from "../dataPicker/DataPicker";
import { makePickerFieldTriggerStyles } from "../dataPicker/shared/pickerFieldTriggerStyles";
import { log } from "../../utils/Logger";
import { getParentGateMessage } from "../../utils/cascade/parentGate";
import {
  AppColors,
  useAppColors,
  useStrongBorderColor,
  useStyles,
  useThemeValue,
} from "../../utils/helpers/colors";
import { useAssetFormKeyboard } from "../assets/shared/AssetFormScreenShell";
import { markLocalPreview } from "../../utils/Image";
import {
  clearFormImageTouched,
  getFormImageOriginal,
  isFormImageTouched,
  markFormImageTouched,
  trackFormImageOriginal,
} from "../../utils/formImageOriginals";

const makeLocalStyles = (c: AppColors) => ({
  inputRowInvalid: {
    borderColor: c.red,
    backgroundColor: c.redSurface,
  },
  textInput: {
    color: c.text,
  },
  prefix: {
    marginLeft: 8,
    color: c.text,
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: "top" as const,
    color: c.text,
  },
  /* Chưa có ảnh: bày thẳng hai lối vào cạnh nhau — chụp tại chỗ là việc hay làm
     nhất khi đứng trước máy móc, nên nó là nút chính, tô nền đỏ. */
  imagePickerRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 6,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  imagePickerButtonPrimary: {
    backgroundColor: c.red,
    borderColor: c.red,
  },
  imagePickerButtonSecondary: {
    backgroundColor: c.surface,
    borderColor: c.redBorder,
    borderStyle: "dashed" as const,
  },
  imagePickerTextPrimary: {
    fontSize: 13.5,
    fontWeight: "700" as const,
    color: "#fff",
  },
  imagePickerTextSecondary: {
    fontSize: 13.5,
    fontWeight: "700" as const,
    color: c.red,
  },
  imageWrap: {
    marginTop: 10,
  },
  /* Có ảnh rồi thì ảnh chính là nội dung: cho tràn hết bề rộng thẻ, khung 4:3
     để mọi ảnh cao thấp khác nhau vẫn xếp thành một cột thẳng. */
  imageCard: {
    width: "100%" as const,
    aspectRatio: 4 / 3,
    borderRadius: 14,
    overflow: "hidden" as const,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  imageCardLoading: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderStyle: "dashed" as const,
  },
  imagePreview: {
    width: "100%" as const,
    height: "100%" as const,
  },
  /* Nút đặt chồng lên ảnh, nền tối mờ để đọc được trên cả ảnh sáng và ảnh tối. */
  imageActions: {
    position: "absolute" as const,
    right: 10,
    bottom: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  imageUndoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: 5,
    marginTop: 8,
    paddingVertical: 4,
  },
  imageUndoText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: c.textSub,
    textDecorationLine: "underline" as const,
  },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(17,24,39,0.45)",
  },
  imageActionsHidden: {
    opacity: 0,
  },
  imageActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(17,24,39,0.72)",
  },
  linkWrap: {
    gap: 10,
  },
  inputText: {
    color: c.text,
  },
  linkText: {
    fontSize: 14,
    color: "blue",
  },
  selectText: {
    color: c.text,
  },
  selectedValueText: {
    color: c.text,
  },
  placeholderValueText: {
    color: c.textMuted,
  },
  selectInputInvalid: {
    borderColor: c.red,
    backgroundColor: c.redSurface,
  },
  selectInputBlocked: {
    opacity: 0.55,
    backgroundColor: c.surfaceAlt,
  },
  textAreaInvalid: {
    borderColor: c.red,
    backgroundColor: c.redSurface,
  },
  fieldWrapInvalid: {
    borderWidth: 1,
    borderColor: c.red,
    borderRadius: 12,
    overflow: "hidden" as const,
    backgroundColor: c.redSurface,
  },
});

function LinkInputField({
  value,
  onChange,
  styles,
}: {
  value: unknown;
  onChange: (nextValue: string) => void;
  styles: RenderInputByTypeProps["styles"];
}) {
  const c = useAppColors();
  const localStyles = useThemeValue(makeLocalStyles);
  const keyboardContext = useAssetFormKeyboard();
  const strongBorderColor = useStrongBorderColor();
  const urlInputRef = React.useRef<TextInput>(null);
  const labelInputRef = React.useRef<TextInput>(null);
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
        ref={urlInputRef}
        style={[
          styles.input,
          { borderColor: strongBorderColor },
          localStyles.inputText,
        ]}
        placeholder="Nhập đường link"
        placeholderTextColor={c.textMuted}
        value={url}
        onFocus={() => {
          keyboardContext?.handleInputFocus(urlInputRef.current);
        }}
        onChangeText={(nextUrl) => {
          setUrl(nextUrl);
          onChange(buildHtml(nextUrl, label));
        }}
      />
      <TextInput
        ref={labelInputRef}
        style={[
          styles.input,
          { borderColor: strongBorderColor },
          localStyles.inputText,
        ]}
        placeholder="Nhập label"
        placeholderTextColor={c.textMuted}
        value={label}
        onFocus={() => {
          keyboardContext?.handleInputFocus(labelInputRef.current);
        }}
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
  disableNumberGrouping,
  openEnumReferanceModal,
  parentGate,
  parentGateMessage,
  isLocked = false,
}: RenderInputByTypeProps) => {
  const c = useAppColors();
  const localStyles = useThemeValue(makeLocalStyles);
  const pickerFieldTriggerStyles = useStyles(makePickerFieldTriggerStyles);
  const keyboardContext = useAssetFormKeyboard();
  const strongBorderColor = useStrongBorderColor();
  const basicInputRef = React.useRef<TextInput>(null);
  const numberInputRef = React.useRef<TextInput>(null);
  const textAreaWrapRef = React.useRef<View>(null);
  const textAreaRef = React.useRef<TextInput>(null);
  /* Mốc ảnh gốc nằm ở `formImageOriginals` (ngoài component) vì gập nhóm trường
     là field bị tháo khỏi cây, state trong này mất sạch. */
  const [imageTouched, setImageTouchedState] = React.useState(() =>
    isFormImageTouched(f.name),
  );
  const setImageTouched = (nextTouched: boolean) => {
    if (nextTouched) markFormImageTouched(f.name);
    else clearFormImageTouched(f.name);
    setImageTouchedState(nextTouched);
  };
  const value = formData[f.name];
  const hasValidationError = Boolean(validationErrors?.[f.name]);
  const items = useMemo(
    () =>
      f.typeProperty === TypeProperty.Reference
        ? referenceData[f.name]?.items || []
        : enumData[f.name] || [],
    [enumData, f.name, f.typeProperty, referenceData],
  );

  const hasValue = value !== null && value !== undefined && value !== "";

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

  /* Ảnh gốc về muộn (phải tải từ server mới có preview), nên cứ cập nhật mốc cho
     tới khi người dùng động vào field lần đầu. */
  const currentImagePreview = images[f.name];
  useEffect(() => {
    if (f.typeProperty !== TypeProperty.Image || imageTouched) return;

    trackFormImageOriginal(
      f.name,
      currentImagePreview ? { preview: currentImagePreview, value } : null,
    );
  }, [currentImagePreview, f.name, f.typeProperty, imageTouched, value]);

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

  const handleInputFocus = (target: any) => {
    keyboardContext?.handleInputFocus(target);
  };

  const renderBasicInput = ({
    keyboardType = "default",
  }: { keyboardType?: "default" | "numeric" } = {}) => (
    <View
      style={[
        pickerFieldTriggerStyles.input,
        { borderColor: strongBorderColor },
        hasValidationError && localStyles.inputRowInvalid,
      ]}
    >
      <TextInput
        ref={basicInputRef}
        editable={!isLocked}
        style={[pickerFieldTriggerStyles.textInput, localStyles.textInput]}
        keyboardType={keyboardType}
        value={String(value ?? "")}
        placeholder={`Nhập ${f.moTa ?? f.name}`}
        placeholderTextColor={c.textMuted}
        onFocus={() => handleInputFocus(basicInputRef.current)}
        onChangeText={(t) => handleChange(f.name, t)}
      />

      {f.prefix ? <Text style={localStyles.prefix}>{f.prefix}</Text> : null}
    </View>
  );

  /** Ô bấm-để-mở-danh-sách, dùng chung cho Enum và Reference. */
  const renderPickerTrigger = ({
    blocked = false,
    blockedText,
  }: { blocked?: boolean; blockedText?: string } = {}) => (
    <TouchableOpacity
      style={[
        pickerFieldTriggerStyles.input,
        { borderColor: strongBorderColor },
        hasValidationError && localStyles.selectInputInvalid,
        blocked && localStyles.selectInputBlocked,
      ]}
      disabled={blocked}
      accessibilityState={{ disabled: blocked }}
      onPress={() => {
        keyboardContext?.dismissKeyboard();
        openEnumReferanceModal?.(f);
      }}
    >
      {/* Bị khoá mà ĐÃ có giá trị thì vẫn hiện giá trị (nhãn lấy từ
          `<field>_MoTa`, không phụ thuộc danh sách): che nó bằng câu nhắc là
          màn Sửa trông như đã mất dữ liệu. Câu nhắc chỉ thay chỗ placeholder. */}
      <Text
        style={[
          pickerFieldTriggerStyles.text,
          localStyles.selectText,
          hasValue
            ? localStyles.selectedValueText
            : localStyles.placeholderValueText,
        ]}
      >
        {blocked && !hasValue && blockedText ? blockedText : displayText}
      </Text>

      <Ionicons
        name="chevron-down"
        size={20}
        color={blocked ? c.textMuted : c.textSecondary}
        style={pickerFieldTriggerStyles.icon}
      />
    </TouchableOpacity>
  );

  switch (f.typeProperty) {
    case TypeProperty.Int:
    case TypeProperty.Decimal: {
      const formattedValue = disableNumberGrouping
        ? String(value ?? "")
        : formatVND(value);

      return (
        <View
          style={[
            pickerFieldTriggerStyles.input,
            { borderColor: strongBorderColor },
            hasValidationError && localStyles.inputRowInvalid,
          ]}
        >
          <TextInput
            ref={numberInputRef}
            editable={!isLocked}
            style={[pickerFieldTriggerStyles.textInput, localStyles.textInput]}
            keyboardType="numeric"
            value={formattedValue}
            placeholder={`Nhập ${f.moTa ?? f.name}`}
            placeholderTextColor={c.textMuted}
            onFocus={() => handleInputFocus(numberInputRef.current)}
            onChangeText={(text) => {
              const raw = disableNumberGrouping ? text : unFormatVND(text);
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
            disabled={isLocked}
            onValueChange={(v) => handleChange(f.name, v)}
            trackColor={{ false: c.borderStrong, true: c.red }}
            thumbColor={value ? "#ffffff" : "#f4f3f4"}
          />
        </View>
      );

    case TypeProperty.Date:
      return (
        <View
          style={hasValidationError ? localStyles.fieldWrapInvalid : undefined}
        >
          <DatePicker value={value} onChange={(d) => handleChange(f.name, d)} />
        </View>
      );

    case TypeProperty.Time:
      return (
        <View
          style={hasValidationError ? localStyles.fieldWrapInvalid : undefined}
        >
          <TimePicker value={value} onChange={(d) => handleChange(f.name, d)} />
        </View>
      );

    case TypeProperty.String:
      return renderBasicInput();

    case TypeProperty.Text:
      return (
        <View ref={textAreaWrapRef} collapsable={false}>
          <TextInput
            ref={textAreaRef}
            style={[
              styles.textArea,
              { borderColor: strongBorderColor },
              localStyles.textArea,
              hasValidationError && localStyles.textAreaInvalid,
            ]}
            multiline
            value={String(value ?? "")}
            placeholder={`Nhập ${f.moTa ?? f.name}`}
            placeholderTextColor={c.textMuted}
            onFocus={() => handleInputFocus(textAreaWrapRef.current)}
            onChangeText={(t) => handleChange(f.name, t)}
          />
        </View>
      );

    case TypeProperty.Image: {
      const imgUrl = images[f.name];
      const loading = loadingImages[f.name];
      const fieldLabel = f.moTa ?? f.name;

      /* Chụp là chụp rồi tải lên luôn, không qua bước xác nhận nào — bấm một lần
         là ảnh đã nằm trong form, giống gửi ảnh trong Zalo.
         Cờ tải do `pickImage` bật, và chỉ bật sau khi đã chọn được ảnh, nên lúc
         thư viện đang mở thì ảnh cũ vẫn còn nguyên trên form. */
      const openPicker = async (source: "camera" | "library") => {
        const uploadedUrl = await pickImage(
          f.name,
          handleChange,
          setImages,
          setLoadingImages,
          source,
        );

        // `pickImage` đã chốt mốc ảnh gốc đúng lúc chọn được ảnh; ở đây chỉ cần
        // đồng bộ state để field render lại và hiện nút hoàn tác. Hủy giữa đường
        // thì không có gì xảy ra, mốc vẫn để ngỏ.
        if (uploadedUrl) setImageTouched(true);
      };

      const removeImage = () => {
        setImageTouched(true);
        setImages((p: any) => ({ ...p, [f.name]: "" }));
        handleChange(f.name, "---");
      };

      const originalImage = getFormImageOriginal(f.name);
      /* Chỉ mời hoàn tác khi giá trị hiện tại đã khác ảnh gốc — thay xong rồi
         hoàn tác rồi thì nút biến mất, không còn gì để trả về nữa. */
      const canUndo = Boolean(
        imageTouched &&
          originalImage &&
          String(value ?? "") !== String(originalImage.value ?? ""),
      );

      const undoImage = () => {
        if (!originalImage) return;

        // Preview ảnh gốc đã nằm sẵn trong tay, đánh dấu để không phải tải lại.
        markLocalPreview(f.name, String(originalImage.value));
        setImages((p: any) => ({ ...p, [f.name]: originalImage.preview }));
        handleChange(f.name, originalImage.value);
        setImageTouched(false);
      };

      const undoButton = canUndo ? (
        <TouchableOpacity
          style={localStyles.imageUndoRow}
          onPress={undoImage}
          accessibilityRole="button"
          accessibilityLabel={`Hoàn tác ${fieldLabel} về ảnh gốc`}
        >
          <Ionicons name="arrow-undo-outline" size={14} color={c.textSub} />
          <Text style={localStyles.imageUndoText}>Hoàn tác về ảnh gốc</Text>
        </TouchableOpacity>
      ) : null;

      /* Chưa có ảnh nào thì mới thay cả ô bằng vòng xoay; có ảnh rồi thì giữ ảnh
         cũ và chỉ phủ mờ lên trên, thay được thì mới đổi. */
      if (loading && !imgUrl) {
        return (
          <View style={localStyles.imageWrap}>
            <View style={[localStyles.imageCard, localStyles.imageCardLoading]}>
              <IsLoading size="small" />
            </View>
          </View>
        );
      }

      /* Đã có ảnh thì ảnh chính là nội dung: ba nút đặt chồng lên góc dưới —
         chụp lại, chọn ảnh khác, xóa — không cần nút rời phía trên nữa. */
      if (imgUrl) {
        return (
          <View style={localStyles.imageWrap}>
            <View style={localStyles.imageCard}>
              <Image
                source={{ uri: imgUrl }}
                style={localStyles.imagePreview}
                resizeMode="cover"
              />

              {loading ? (
                <View style={localStyles.imageUploadingOverlay}>
                  <IsLoading size="small" color="#fff" />
                </View>
              ) : null}

              <View
                style={[
                  localStyles.imageActions,
                  loading && localStyles.imageActionsHidden,
                ]}
                pointerEvents={loading ? "none" : "auto"}
              >
                <TouchableOpacity
                  onPress={() => openPicker("camera")}
                  style={localStyles.imageActionIcon}
                  accessibilityRole="button"
                  accessibilityLabel={`Chụp lại ${fieldLabel}`}
                >
                  <Ionicons name="camera-outline" size={17} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openPicker("library")}
                  style={localStyles.imageActionIcon}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn ảnh khác cho ${fieldLabel}`}
                >
                  <Ionicons name="images-outline" size={16} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={removeImage}
                  style={localStyles.imageActionIcon}
                  accessibilityRole="button"
                  accessibilityLabel={`Xóa ${fieldLabel}`}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {undoButton}
          </View>
        );
      }

      return (
        <View>
          <View style={localStyles.imagePickerRow}>
            <TouchableOpacity
              style={[
                localStyles.imagePickerButton,
                localStyles.imagePickerButtonPrimary,
              ]}
              onPress={() => openPicker("camera")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Chụp ảnh cho ${fieldLabel}`}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={localStyles.imagePickerTextPrimary} numberOfLines={1}>
                Chụp ảnh
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                localStyles.imagePickerButton,
                localStyles.imagePickerButtonSecondary,
              ]}
              onPress={() => openPicker("library")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Chọn ảnh từ thư viện cho ${fieldLabel}`}
            >
              <Ionicons name="images-outline" size={18} color={c.red} />
              <Text
                style={localStyles.imagePickerTextSecondary}
                numberOfLines={1}
              >
                Thư viện
              </Text>
            </TouchableOpacity>
          </View>

          {undoButton}
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

    /* Enum tách riêng khỏi Reference: Enum lấy danh sách bằng
       `get-category-enum` (không có cấp cha) nên KHÔNG BAO GIỜ bị khoá vì thiếu
       cấp cha — metadata có field Enum mang `parentsFields` rác. */
    case TypeProperty.Enum:
      return renderPickerTrigger({ blocked: isLocked });

    case TypeProperty.Reference: {
      /* Thiếu cấp cha thì khoá ô: chuỗi `lstParent` bị nối thẳng vào SelectSql
         nên thiếu vế là lỗi SQL 500 hoặc khớp sai dòng có cấp cuối NULL — xem
         `src/utils/cascade/parentGate.ts`. Loader cũng chặn, đây là lớp UI để
         người dùng biết phải chọn cấp trên trước. */
      const blocked =
        isLocked || Boolean(parentGate?.hasParents && !parentGate.isReady);

      return renderPickerTrigger({
        blocked,
        blockedText: blocked
          ? parentGateMessage || getParentGateMessage(parentGate)
          : undefined,
      });
    }

    default:
      return renderBasicInput({ keyboardType: "numeric" });
  }
};
