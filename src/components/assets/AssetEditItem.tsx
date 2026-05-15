import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";

import { AssetEditItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import { getMatchedKey } from "../../utils/Helper";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../../utils/helpers/api";
import { isEffectivelyEmptyCodeValue } from "../../utils/helpers/string";
import { useParams } from "../../hooks/useParams";
import { fetchImage, pickImage } from "../../utils/Image";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { handleCascadeChange } from "../../utils/cascade/Index";
import { useImageLoader } from "../../hooks/useImageLoader";
import { checkValidation, update } from "../../services/data/CallApi";
import { useNavigation } from "@react-navigation/native";
import { setShouldRefreshDetails } from "../../store/AssetSlice";

import {
  formatDateForBE,
  getDefaultValueForField,
  normalizeDateFromBE,
} from "../../utils/Date";

import { useAppDispatch } from "../../store/Hooks";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import AssetFormActionButton from "./shared/AssetFormActionButton";
import AssetFormGroupedFields from "./shared/AssetFormGroupedFields";
import AssetFormHeroCard from "./shared/AssetFormHeroCard";
import AssetFormReferencePickerModal from "./shared/AssetFormReferencePickerModal";
import AssetFormScreenShell from "./shared/AssetFormScreenShell";
import { createAssetFormBaseStyles } from "./shared/assetFormStyles";
import {
  ASSET_FORM_BG,
  ASSET_FORM_BRAND_RED,
  ASSET_FORM_CARD_SHADOW,
} from "./shared/assetFormTheme";

const BRAND_RED = ASSET_FORM_BRAND_RED;
const BG = ASSET_FORM_BG;
const CARD_SHADOW = ASSET_FORM_CARD_SHADOW;

export default function AssetEditItem() {
  const { item, field, nameClass } = useParams();
  const navigation = useNavigation<AssetEditItemNavigationProp>();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalItem, setOriginalItem] = useState<Record<string, any>>(
    item ? { ...item } : {},
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
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  const [images, setImages] = useState<Record<string, string>>({});

  const { fieldActive, groupedFields, collapsedGroups, toggleGroup } =
    useGroupedFields(field);

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
          break;
        case TypeProperty.Reference: {
          const rawText =
            (matchedKey && item?.[`${matchedKey}_MoTa`]) ??
            item?.[`${name}_MoTa`] ??
            item?.[`${f.name}_MoTa`] ??
            "";

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
    referenceData,
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
            setReferenceData,
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
    setReferenceData,
    pageSize: PAGE_SIZE,
  });

  const modalItems = useModalItems(
    activeEnumField,
    referenceData,
    enumData,
    formData,
  );
  const { showAlertIfActive } = useSafeAlert();

  const handleUpdate = async () => {
    try {
      if (!originalItem?.id) {
        Alert.alert("Lỗi", "Không tìm thấy ID để cập nhật!");
        return;
      }

      const entity: Record<string, any> = {};

      fieldActive.forEach((f) => {
        const key = f.name;
        const value = formData[key];

        switch (f.typeProperty) {
          case TypeProperty.Date:
            entity[key] = value ? formatDateForBE(value) : null;
            break;

          case TypeProperty.Int:
          case TypeProperty.Decimal:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : Number(value);
            break;

          case TypeProperty.Text:
          case TypeProperty.String:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
            break;

          case TypeProperty.Enum:
          case TypeProperty.Reference:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
            break;

          case TypeProperty.Image:
            if (value === "---") {
              entity[key] = "";
            } else {
              entity[key] =
                value === "" || value === null || value === undefined
                  ? null
                  : value;
            }
            break;

          default:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
        }
      });

      Object.keys(entity).forEach((k) => {
        if (k.endsWith("_MoTa")) delete entity[k];
      });

      const autoCodeField = item?.propertyClass?.propertyTuDongTang;
      if (
        autoCodeField &&
        isEffectivelyEmptyCodeValue(entity[autoCodeField])
      ) {
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
        getApiErrorMessage(err, "Không thể cập nhật dữ liệu!"),
      );
    }
  };

  const handleReset = () => {
    if (!originalItem) return;

    const reset: Record<string, any> = {};

    fieldActive.forEach((f) => {
      const matchedKey = getMatchedKey(originalItem || {}, f.name);
      const raw = matchedKey ? originalItem[matchedKey] : undefined;

      switch (f.typeProperty) {
        case TypeProperty.Date:
          reset[f.name] = raw ? normalizeDateFromBE(raw) : "";
          break;

        case TypeProperty.Image:
          reset[f.name] = raw ?? "";
          break;

        case TypeProperty.Link:
          reset[f.name] = raw ?? "";
          break;

        case TypeProperty.Reference:
          const rawText =
            (matchedKey && originalItem?.[`${matchedKey}_MoTa`]) ??
            originalItem?.[`${f.name}_MoTa`];
          reset[f.name] = raw != null ? raw : rawText ?? "";
          break;

        default:
          reset[f.name] = raw != null ? raw : "";
      }
    });

    setFormData(reset);
    fieldActive.forEach((f) => {
      const matchedKey = getMatchedKey(originalItem || {}, f.name);
      const raw = matchedKey ? originalItem[matchedKey] : undefined;

      if (f.typeProperty === TypeProperty.Image) {
        if (!raw || raw === "---") {
          setImages((p) => ({ ...p, [f.name]: "" }));
          return;
        }

        fetchImage(f.name, raw, setLoadingImages, setImages);
      }
    });
  };

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
          refHasMore={refHasMore}
          refKeyword={refKeyword}
          refLoadingMore={refLoadingMore}
          refPage={refPage}
          refSearching={refSearching}
          referenceData={referenceData}
          setFormData={setFormData}
          setModalVisible={setModalVisible}
          setRefHasMore={setRefHasMore}
          setRefKeyword={setRefKeyword}
          setRefLoadingMore={setRefLoadingMore}
          setRefPage={setRefPage}
          setRefSearching={setRefSearching}
        />
      }
    >
      <AssetFormHeroCard
        iconBgColor="#EEF2FF"
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

      <View style={styles.actionRow}>
        <AssetFormActionButton
          brandColor={BRAND_RED}
          iconName="save-outline"
          label="Cập nhật"
          onPress={handleUpdate}
          style={[styles.updateButton, styles.actionButton]}
        />

        <AssetFormActionButton
          brandColor={BRAND_RED}
          iconName="refresh-outline"
          label="Reset"
          onPress={() =>
            Alert.alert(
              "Xác nhận",
              "Bạn muốn đặt lại mọi thay đổi về giá trị ban đầu?",
              [
                { text: "Huỷ", style: "cancel" },
                { text: "Đặt lại", onPress: handleReset },
              ],
            )
          }
          style={[styles.resetButton, styles.actionButton]}
          variant="secondary"
        />
      </View>
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
    backgroundColor: "#EEF2FF",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },

  updateButton: {
    ...CARD_SHADOW,
  },

  resetButton: {
    ...CARD_SHADOW,
  },
});
