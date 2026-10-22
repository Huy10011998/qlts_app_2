import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type {
  AssetEditItemNavigationProp,
  Field,
  ReferenceDataMap,
} from "../../types/index";
import { TypeProperty } from "../../utils/Enum";
import { getMatchedKey } from "../../utils/Helper";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../../utils/helpers/api";
import { isEffectivelyEmptyCodeValue } from "../../utils/helpers/string";
import { AppColors, useStyles } from "../../utils/helpers/colors";
import { useParams } from "../../hooks/useParams";
import { fetchImage, pickImage } from "../../utils/Image";
import { useCascadeParentReload } from "../../hooks/AssetAddItem/useCascadeParentReload";
import { handleCascadeChange } from "../../utils/cascade/index";
import { useImageLoader } from "../../hooks/useImageLoader";
import { checkValidation, update } from "../../services/data/callApi";
import { useNavigation } from "@react-navigation/native";
import {
  setShouldRefreshDetails,
  setUpdatedListItem,
} from "../../store/AssetSlice";

import {
  formatDateForBE,
  normalizeDateFromBE,
} from "../../utils/Date";

import { useAppDispatch } from "../../store/hooks";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import { showAppToast } from "../ui/AppToast";
import AssetFormGroupedFields from "./shared/AssetFormGroupedFields";
import AssetFormReferencePickerModal from "./shared/AssetFormReferencePickerModal";
import AssetFormScreenShell from "./shared/AssetFormScreenShell";
import { createAssetFormHeaderSubmitRight } from "./shared/AssetFormHeaderSubmitButton";
import { useAssetFormDirty } from "./shared/useAssetFormDirty";
import {
  getRequiredFieldErrors,
  getRequiredFieldsMessage,
} from "./shared/assetFormValidation";
import {
  getUpdateExcludeFieldNames,
  normalizeBase64ImageFields,
} from "./shared/assetFormPayload";
import { toBase64FieldPayload } from "../../utils/imageBase64";
import { createAssetFormBaseStyles } from "./shared/assetFormStyles";
import { ASSET_FORM_BRAND_RED } from "./shared/assetFormTheme";
import { AppAlert } from "../ui/AppAlert";

const BRAND_RED = ASSET_FORM_BRAND_RED;

const normalizeComparableValue = (value: any) => {
  if (value === undefined || value === "") return null;
  return value;
};

const normalizeUpdateFieldValue = (field: Field, value: any) => {
  switch (field.typeProperty) {
    case TypeProperty.Date:
      return value ? formatDateForBE(value) : null;

    case TypeProperty.Int:
    case TypeProperty.Decimal:
      return value === "" || value === null || value === undefined
        ? null
        : Number(value);

    case TypeProperty.Text:
    case TypeProperty.String:
    case TypeProperty.Enum:
    case TypeProperty.Reference:
      return value === "" || value === null || value === undefined
        ? null
        : value;

    /* Ảnh lưu thẳng trong cột: giữ nguyên data URL đã nhận (cách 5c của BE —
       gửi trọn dòng), chỉ ép giá trị rỗng / lỗi về null. */
    case TypeProperty.ImageBase64:
      return toBase64FieldPayload(value);

    case TypeProperty.Image:
      if (value === "---") return "";
      return value === "" || value === null || value === undefined
        ? null
        : value;

    default:
      return value === "" || value === null || value === undefined
        ? null
        : value;
  }
};

const buildUpdateEntity = (
  fields: Field[],
  values: Record<string, any>,
  baseValues?: Record<string, any>,
) => {
  const entity: Record<string, any> = baseValues ? { ...baseValues } : {};

  fields.forEach((field) => {
    const valueSource = field.isReadOnly && baseValues ? baseValues : values;
    const matchedKey = getMatchedKey(valueSource, field.name);
    const value = matchedKey
      ? valueSource[matchedKey]
      : valueSource[field.name];
    const entityKey = getMatchedKey(entity, field.name) ?? field.name;
    entity[entityKey] = normalizeUpdateFieldValue(field, value);
  });

  Object.keys(entity).forEach((key) => {
    if (key.endsWith("_MoTa")) delete entity[key];
  });

  return entity;
};

const areUpdateValuesEqual = (
  a: Record<string, any>,
  b: Record<string, any>,
) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    if (normalizeComparableValue(a[key]) !== normalizeComparableValue(b[key])) {
      return false;
    }
  }

  return true;
};

export default function AssetEditItem() {
  const styles = useStyles(makeStyles);
  const { item, field, nameClass } = useParams();
  const navigation = useNavigation<AssetEditItemNavigationProp>();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalItem, setOriginalItem] = useState<Record<string, any>>(
    item ? { ...item } : {},
  );

  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<ReferenceDataMap>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State trong closure của nút header có thể còn cũ ở cú bấm thứ hai, nên chặn
  // bấm đúp bằng ref — đọc được ngay, không đợi render.
  const submittingRef = React.useRef(false);

  const PAGE_SIZE = 20;
  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [referenceErrorMessage, setReferenceErrorMessage] = useState<
    string | null
  >(null);
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  const [images, setImages] = useState<Record<string, string>>({});

  const {
    fieldActive,
    groupedFields,
    collapsedGroups,
    toggleGroup,
    expandGroupsWithErrors,
  } = useGroupedFields(field);

  const currentEntity = useMemo(
    () => buildUpdateEntity(fieldActive, formData, originalItem),
    [fieldActive, formData, originalItem],
  );

  const originalEntity = useMemo(
    () => buildUpdateEntity(fieldActive, originalItem, originalItem),
    [fieldActive, originalItem],
  );

  const hasFormChanges = useMemo(
    () => !areUpdateValuesEqual(currentEntity, originalEntity),
    [currentEntity, originalEntity],
  );

  /* Chỉ hỏi "Bỏ thay đổi?" khi người dùng đã thật sự sửa. `hasFormChanges` một
     mình là chưa đủ: ở lượt render đầu form còn rỗng (effect nạp giá trị chưa
     chạy) nên nó báo "có thay đổi", và ô Bool đang trống (null) nạp lên form
     thành false cũng lệch so với bản gốc dù không ai đụng vào. */
  const { isDirty: hasUserEdits, markUserEdit } = useAssetFormDirty(formData);
  const { leaveWithoutPrompt } = useUnsavedChangesGuard(
    hasUserEdits && hasFormChanges,
  );

  useEffect(() => {
    const initial: Record<string, any> = {};

    if (!fieldActive || !fieldActive.length) {
      setFormData(item ? { ...item } : {});
      setOriginalItem(item ? { ...item } : {});
      return;
    }

    fieldActive.forEach((f) => {
      const name = f.name;
      const matchedKey = getMatchedKey(item || {}, name);
      const raw = matchedKey ? item?.[matchedKey] : undefined;
      const matchedMoTaKey = getMatchedKey(item || {}, `${name}_MoTa`);
      const matchedKeyMoTaKey = matchedKey
        ? getMatchedKey(item || {}, `${matchedKey}_MoTa`)
        : undefined;
      const rawText =
        (matchedKeyMoTaKey && item?.[matchedKeyMoTaKey]) ??
        (matchedMoTaKey && item?.[matchedMoTaKey]) ??
        "";

      switch (f.typeProperty) {
        case TypeProperty.Date:
          initial[name] = raw ? normalizeDateFromBE(raw) : "";
          break;
        case TypeProperty.Bool:
          initial[name] =
            raw === true || raw === 1 || raw === "1"
              ? true
              : raw === false || raw === 0 || raw === "0"
              ? false
              : !!raw;
          break;
        case TypeProperty.Int:
        case TypeProperty.Decimal:
          initial[name] = raw != null && raw !== "" ? raw : "";
          break;
        case TypeProperty.Enum:
          initial[name] = raw != null ? raw : "";
          initial[`${name}_MoTa`] = rawText ?? "";
          break;
        case TypeProperty.Reference: {
          initial[name] = raw ?? "";
          initial[`${name}_MoTa`] = rawText ?? "";

          break;
        }

        case TypeProperty.Image:
          if (raw && raw !== "---") {
            initial[name] = raw;
            fetchImage(name, raw, setLoadingImages, setImages);
          } else {
            initial[name] = "";
          }
          break;

        default:
          initial[name] = raw != null ? raw : "";
      }
    });

    setFormData(initial);
    setOriginalItem(item ? { ...item } : {});
  }, [fieldActive, item]);

  const { pendingEnumFields } = useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  useCascadeParentReload(fieldActive, formData, setReferenceData);

  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  const handleChange = (name: string, value: any) => {
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    handleCascadeChange({
      name,
      value,
      fieldActive,
      setFormData,
      setReferenceData,
    });
  };

  /* Đường sửa của người dùng (ô nhập, picker, ảnh) — tách khỏi `handleChange`
     để mốc "đã sửa" chỉ tính thao tác tay. */
  const handleUserChange = (name: string, value: any) => {
    markUserEdit();
    handleChange(name, value);
  };

  const { openReferenceModal, loadReferenceModalData } = useOpenReferenceModal({
    formData,
    fieldActive,
    setActiveEnumField,
    setRefKeyword,
    setRefPage,
    setRefHasMore,
    setModalVisible,
    setReferenceErrorMessage,
    setReferenceData,
    pageSize: PAGE_SIZE,
  });

  const modalItems = useModalItems(
    activeEnumField,
    referenceData,
    enumData,
    formData,
    refKeyword,
  );
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const handleUpdate = async () => {
    if (submittingRef.current) return;

    let saved = false;

    try {
      if (!originalItem?.id) {
        AppAlert.alert("Lỗi", "Không tìm thấy ID để cập nhật!");
        return;
      }

      if (!hasFormChanges) {
        AppAlert.alert("Thông báo", "Chưa có thay đổi để lưu.");
        return;
      }

      const requiredErrors = getRequiredFieldErrors(fieldActive, formData);
      if (Object.keys(requiredErrors).length) {
        setValidationErrors((prev) => ({ ...prev, ...requiredErrors }));
        expandGroupsWithErrors(requiredErrors);
        AppAlert.alert(
          "Thiếu thông tin",
          getRequiredFieldsMessage(fieldActive, requiredErrors),
        );
        return;
      }

      /* Bỏ field ảnh tính sẵn của web (QRCode) — không phải cột của bảng. */
      const entity: Record<string, any> = normalizeBase64ImageFields(
        fieldActive,
        currentEntity,
      );
      const readOnlyFieldNames = getUpdateExcludeFieldNames(fieldActive);

      const autoCodeField = item?.propertyClass?.propertyTuDongTang;
      if (autoCodeField && isEffectivelyEmptyCodeValue(entity[autoCodeField])) {
        entity[autoCodeField] = null;
      }

      const body = {
        entity,
        iDs: [originalItem.id],
        lstIncludeProperties: [],
        lstExcludeProperties: readOnlyFieldNames,
        saveHistory: true,
      };

      if (!nameClass) {
        AppAlert.alert("Lỗi", "Không tìm thấy nameClass để update!");
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);

      await checkValidation(nameClass, {
        data: entity,
        id: Number(originalItem.id ?? 0),
      });

      await update(nameClass, body);
      saved = true;

      dispatch(setShouldRefreshDetails(true));
      dispatch(
        setUpdatedListItem({
          id: String(originalItem.id),
          nameClass,
        }),
      );
      // Dải toast nằm ở gốc app nên vẫn hiện sau khi màn này đóng — khỏi bắt
      // bấm OK cho mỗi lần lưu.
      showAppToast({ message: "Cập nhật thành công" });

      // Người dùng đã rời màn trong lúc chờ lưu thì không kéo họ đi đâu nữa.
      if (!isMounted()) return;

      setFormData({});
      setImages({});
      leaveWithoutPrompt(() => navigation.goBack());
    } catch (err: any) {
      setValidationErrors(getApiValidationFieldErrors(err));
      showAlertIfActive(
        "Lỗi",
        getApiErrorMessage(err, "Không thể cập nhật dữ liệu!"),
      );
    } finally {
      // Lưu xong thì giữ khoá: màn đang đóng, không để lọt thêm một lượt lưu
      // nào trong lúc chuyển màn.
      if (!saved) {
        submittingRef.current = false;
        if (isMounted()) setIsSubmitting(false);
      }
    }
  };

  const handleUpdateRef = React.useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: createAssetFormHeaderSubmitRight({
        disabled: !hasFormChanges || isSubmitting,
        iconName: "save-outline",
        label: "Lưu",
        onPress: () => handleUpdateRef.current(),
      }),
    });
  }, [hasFormChanges, isSubmitting, navigation]);

  return (
    <AssetFormScreenShell
      brandColor={BRAND_RED}
      contentContainerStyle={styles.scrollContent}
      isSubmitting={isSubmitting}
      loadingOverlayStyle={styles.loadingOverlay}
      style={styles.container}
      modal={
        <AssetFormReferencePickerModal
          pendingEnumFields={pendingEnumFields}
          activeEnumField={activeEnumField}
          formData={formData}
          handleChange={handleUserChange}
          loadReferenceModalData={loadReferenceModalData}
          modalItems={modalItems}
          modalVisible={modalVisible}
          referenceErrorMessage={referenceErrorMessage}
          refHasMore={refHasMore}
          refKeyword={refKeyword}
          refLoadingMore={refLoadingMore}
          refPage={refPage}
          refSearching={refSearching}
          referenceData={referenceData}
          setFormData={setFormData}
          setModalVisible={setModalVisible}
          setReferenceErrorMessage={setReferenceErrorMessage}
          setRefHasMore={setRefHasMore}
          setRefKeyword={setRefKeyword}
          setRefLoadingMore={setRefLoadingMore}
          setRefPage={setRefPage}
          setRefSearching={setRefSearching}
        />
      }
    >
      <AssetFormGroupedFields
        collapsedGroups={collapsedGroups}
        enumData={enumData}
        formData={formData}
        groupedFields={groupedFields}
        handleChange={handleUserChange}
        images={images}
        loadingImages={loadingImages}
        mode="edit"
        openReferenceModal={openReferenceModal}
        pickImage={pickImage}
        referenceData={referenceData}
        validationErrors={validationErrors}
        setImages={setImages}
        setLoadingImages={setLoadingImages}
        styles={styles}
        toggleGroup={toggleGroup}
      />
    </AssetFormScreenShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...createAssetFormBaseStyles(c),
  });
