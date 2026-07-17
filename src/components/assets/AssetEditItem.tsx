import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Alert } from "react-native";

import type { AssetEditItemNavigationProp, Field } from "../../types/index";
import { TypeProperty } from "../../utils/Enum";
import { getMatchedKey } from "../../utils/Helper";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../../utils/helpers/api";
import { isEffectivelyEmptyCodeValue } from "../../utils/helpers/string";
import { C } from "../../utils/helpers/colors";
import { useParams } from "../../hooks/useParams";
import { fetchImage, pickImage } from "../../utils/Image";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { handleCascadeChange } from "../../utils/cascade/index";
import { useImageLoader } from "../../hooks/useImageLoader";
import { checkValidation, update } from "../../services/data/callApi";
import { useNavigation } from "@react-navigation/native";
import { setShouldRefreshDetails } from "../../store/AssetSlice";

import {
  formatDateForBE,
  getDefaultValueForField,
  normalizeDateFromBE,
} from "../../utils/Date";

import { useAppDispatch } from "../../store/hooks";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import AssetFormGroupedFields from "./shared/AssetFormGroupedFields";
import AssetFormHeroCard from "./shared/AssetFormHeroCard";
import AssetFormReferencePickerModal from "./shared/AssetFormReferencePickerModal";
import AssetFormScreenShell from "./shared/AssetFormScreenShell";
import { createAssetFormHeaderSubmitRight } from "./shared/AssetFormHeaderSubmitButton";
import {
  getRequiredFieldErrors,
  getRequiredFieldsMessage,
} from "./shared/assetFormValidation";
import { createAssetFormBaseStyles } from "./shared/assetFormStyles";
import {
  ASSET_FORM_BG,
  ASSET_FORM_BRAND_RED,
  ASSET_FORM_CARD_SHADOW,
} from "./shared/assetFormTheme";

const BRAND_RED = ASSET_FORM_BRAND_RED;
const BG = ASSET_FORM_BG;
const CARD_SHADOW = ASSET_FORM_CARD_SHADOW;

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
) => {
  const entity: Record<string, any> = {};

  fields.forEach((field) => {
    const matchedKey = getMatchedKey(values, field.name);
    const value = matchedKey ? values[matchedKey] : values[field.name];
    entity[field.name] = normalizeUpdateFieldValue(field, value);
  });

  Object.keys(entity).forEach((key) => {
    if (key.endsWith("_MoTa")) delete entity[key];
  });

  return entity;
};

const areUpdateValuesEqual = (a: Record<string, any>, b: Record<string, any>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    if (normalizeComparableValue(a[key]) !== normalizeComparableValue(b[key])) {
      return false;
    }
  }

  return true;
};

export default function AssetEditItem() {
  const { item, field, nameClass } = useParams();
  const navigation = useNavigation<AssetEditItemNavigationProp>();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalItem, setOriginalItem] = useState<Record<string, any>>(
    item ? { ...item } : {}
  );

  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    Record<string, { items: any[]; totalCount: number }>
  >({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

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
    () => buildUpdateEntity(fieldActive, formData),
    [fieldActive, formData],
  );

  const originalEntity = useMemo(
    () => buildUpdateEntity(fieldActive, originalItem),
    [fieldActive, originalItem],
  );

  const hasFormChanges = useMemo(
    () => !areUpdateValuesEqual(currentEntity, originalEntity),
    [currentEntity, originalEntity],
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

  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData
  );

  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Reference && f.parentsFields) {
        const parents = f.parentsFields.split(",");
        const haveAllParents = parents.every((p) => formData[p]);

        if (haveAllParents) {
          const parentValues = parents.map((p) => formData[p]).join(",");
          fetchReferenceByFieldWithParent(
            f.referenceName!,
            f.name,
            parentValues,
            setReferenceData
          );
        }
      }
    });
  }, [fieldActive, formData]);
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

  const { openReferenceModal, loadReferenceModalData } = useOpenReferenceModal({
    formData,
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
    formData
  );
  const { showAlertIfActive } = useSafeAlert();

  const handleUpdate = async () => {
    try {
      if (!originalItem?.id) {
        Alert.alert("Lỗi", "Không tìm thấy ID để cập nhật!");
        return;
      }

      if (!hasFormChanges) {
        Alert.alert("Thông báo", "Chưa có thay đổi để lưu.");
        return;
      }

      const requiredErrors = getRequiredFieldErrors(fieldActive, formData);
      if (Object.keys(requiredErrors).length) {
        setValidationErrors((prev) => ({ ...prev, ...requiredErrors }));
        expandGroupsWithErrors(requiredErrors);
        Alert.alert(
          "Thiếu thông tin",
          getRequiredFieldsMessage(fieldActive, requiredErrors)
        );
        return;
      }

      const entity: Record<string, any> = { ...currentEntity };

      const autoCodeField = item?.propertyClass?.propertyTuDongTang;
      if (autoCodeField && isEffectivelyEmptyCodeValue(entity[autoCodeField])) {
        entity[autoCodeField] = null;
      }

      const body = {
        entity,
        iDs: [originalItem.id],
        lstIncludeProperties: [],
        lstExcludeProperties: [],
        saveHistory: true,
      };

      if (!nameClass) {
        Alert.alert("Lỗi", "Không tìm thấy nameClass để update!");
        return;
      }

      await checkValidation(nameClass, {
        data: entity,
        id: Number(originalItem.id ?? 0),
      });

      await update(nameClass, body);

      showAlertIfActive("Thành công", "Cập nhật thành công!", [
        {
          text: "OK",
          onPress: () => {
            setFormData({});
            setImages({});
            dispatch(setShouldRefreshDetails(true));
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      setValidationErrors(getApiValidationFieldErrors(err));
      showAlertIfActive(
        "Lỗi",
        getApiErrorMessage(err, "Không thể cập nhật dữ liệu!")
      );
    }
  };

  const handleUpdateRef = React.useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: createAssetFormHeaderSubmitRight({
        disabled: !hasFormChanges,
        iconName: "save-outline",
        label: "Lưu",
        onPress: () => handleUpdateRef.current(),
      }),
    });
  }, [hasFormChanges, navigation]);

  return (
    <AssetFormScreenShell
      brandColor={BRAND_RED}
      contentContainerStyle={styles.scrollContent}
      refLoadingMore={refLoadingMore}
      style={styles.container}
      modal={
        <AssetFormReferencePickerModal
          activeEnumField={activeEnumField}
          formData={formData}
          handleChange={handleChange}
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
      <AssetFormHeroCard
        iconBgColor={C.indigoSurface}
        iconColor="#3B5BDB"
        iconName="create-outline"
        styles={styles}
        title="Cập nhật tài sản"
        subtitle="Chỉnh sửa thông tin theo từng nhóm và lưu lại khi hoàn tất."
      />

      <AssetFormGroupedFields
        collapsedGroups={collapsedGroups}
        enumData={enumData}
        formData={formData}
        getDefaultValueForField={getDefaultValueForField}
        groupedFields={groupedFields}
        handleChange={handleChange}
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

const styles = StyleSheet.create({
  ...createAssetFormBaseStyles({
    backgroundColor: BG,
    brandColor: BRAND_RED,
    cardShadow: CARD_SHADOW,
  }),
  heroIconWrap: {
    backgroundColor: C.indigoSurface,
  },
});
