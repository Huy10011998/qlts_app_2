import React, { useMemo, useState } from "react";
import { StyleSheet, Alert } from "react-native";
import { useParams } from "../../hooks/useParams";
import { AssetAddRelatedItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import { useNavigation } from "@react-navigation/native";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../../utils/helpers/api";
import { fetchImage, pickImage } from "../../utils/Image";
import { isEffectivelyEmptyCodeValue } from "../../utils/helpers/string";
import { useImageLoader } from "../../hooks/useImageLoader";
import { checkValidation, getParentValue, insert } from "../../services/data/CallApi";

import { useSelector } from "react-redux";
import { RootState } from "../../store/Index";
import { setShouldRefreshList } from "../../store/AssetSlice";
import { usePermission } from "../../hooks/usePermission";

import { formatDateForBE, getDefaultValueForField } from "../../utils/Date";

import { useAppDispatch } from "../../store/Hooks";
import { useCascadeForm } from "../../hooks/AssetAddItem/useCascadeForm";
import { useDefaultDateTime } from "../../hooks/AssetAddItem/useDefaultDateTime";
import { useAutoIncrementCode } from "../../hooks/AssetAddItem/useAutoIncrementCode";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useTreeToForm } from "../../hooks/AssetAddItem/useTreeToForm";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useLoadParentValue } from "../../hooks/AssetAddItem/useLoadParentValue";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import AssetFormGroupedFields from "./shared/AssetFormGroupedFields";
import AssetFormActionButton from "./shared/AssetFormActionButton";
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

export default function AssetAddRelatedItem() {
  const { field, nameClass, propertyClass, idRoot, nameClassRoot } =
    useParams();
  const { can } = usePermission();
  const dispatch = useAppDispatch();

  const { selectedTreeValue, selectedTreeProperty } = useSelector(
    (state: RootState) => state.asset,
  );

  const navigation = useNavigation<AssetAddRelatedItemNavigationProp>();

  const [formData, setFormData] = useState<Record<string, any>>({});

  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    Record<string, { items: any[]; totalCount: number }>
  >({});

  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  const PAGE_SIZE = 20;
  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  const rawTreeValues = useMemo(() => {
    if (!selectedTreeValue) return [];
    return selectedTreeValue.split(",").map((v) => v.trim());
  }, [selectedTreeValue]);

  const { fieldActive, groupedFields, collapsedGroups, toggleGroup } =
    useGroupedFields(field);

  const { handleChange: baseHandleChange } = useCascadeForm(
    fieldActive,
    setFormData,
    setReferenceData,
  );

  const handleChange = React.useCallback(
    (name: string, value: any) => {
      if (validationErrors[name]) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }

      baseHandleChange(name, value);
    },
    [baseHandleChange, validationErrors],
  );

  useTreeToForm({
    selectedTreeProperty,
    selectedTreeValue,
    fieldActive,
    handleChange,
    setFormData,
    setReferenceData,
  });

  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  const parentField = propertyClass?.prentTuDongTang;
  const parentValue = parentField ? formData[parentField] : undefined;

  useAutoIncrementCode({
    nameClass,
    propertyClass,
    formData,
    rawTreeValues,
    parentValue,
    setFormData,
  });

  useDefaultDateTime(fieldActive, setFormData);

  useLoadParentValue({
    idRoot,
    nameClassRoot,
    nameClass,
    fieldActive,
    getParentValue,
    setReferenceData,
    setFormData,
  });

  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

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
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const handleCreate = async () => {
    if (nameClass && !can(nameClass, "Insert")) {
      Alert.alert("Không có quyền", "Bạn không có quyền tạo mới dữ liệu!");
      return;
    }
    if (!Object.keys(formData).length) {
      Alert.alert("Thông báo", "Vui lòng nhập ít nhất một trường!");
      return;
    }

    if (!nameClass) {
      Alert.alert("Lỗi", "Không xác định được danh mục!");
      return;
    }

    try {
      setIsSubmitting(true);

      const payloadData = { ...formData };

      Object.keys(payloadData).forEach((key) => {
        if (key.endsWith("_MoTa")) delete payloadData[key];
      });

      // Format date
      fieldActive.forEach((f) => {
        if (f.typeProperty === TypeProperty.Date) {
          payloadData[f.name] = formatDateForBE(payloadData[f.name]);
        }
      });

      const payload = {
        entities: [payloadData],
        saveHistory: true,
      };

      const autoCodeField = propertyClass?.propertyTuDongTang;
      if (
        autoCodeField &&
        isEffectivelyEmptyCodeValue(payloadData[autoCodeField])
      ) {
        payloadData[autoCodeField] = null;
      }

      await checkValidation(nameClass, {
        data: payloadData,
        id: 0,
      });

      await insert(nameClass, payload);

      showAlertIfActive(
        "Thành công",
        "Tạo mới thành công!",
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({});
              setImages({});

              dispatch(setShouldRefreshList(true));
              navigation.goBack();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (err: any) {
      setValidationErrors(getApiValidationFieldErrors(err));
      showAlertIfActive(
        "Lỗi",
        getApiErrorMessage(err, "Không thể tạo mới!"),
      );
    } finally {
      if (isMounted()) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AssetFormScreenShell
      brandColor={BRAND_RED}
      contentContainerStyle={styles.scrollContent}
      isSubmitting={isSubmitting}
      loadingOverlayStyle={styles.loadingOverlay}
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
        iconBgColor="#FFF3F3"
        iconColor={BRAND_RED}
        iconName="link-outline"
        styles={styles}
        title="Thêm dữ liệu liên quan"
        subtitle="Tạo mới bản ghi gắn với tài sản hiện tại theo từng nhóm thông tin."
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
        mode="add"
        openReferenceModal={openReferenceModal}
        pickImage={pickImage}
        referenceData={referenceData}
        validationErrors={validationErrors}
        setImages={setImages}
        setLoadingImages={setLoadingImages}
        styles={styles}
        toggleGroup={toggleGroup}
      />

      <AssetFormActionButton
        brandColor={BRAND_RED}
        disabled={!!nameClass && !can(nameClass, "Insert")}
        iconName="checkmark-circle-outline"
        label="Tạo"
        onPress={handleCreate}
        style={styles.createButton}
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
    backgroundColor: "#FFF3F3",
  },
  createButton: {
    ...CARD_SHADOW,
  },
});
