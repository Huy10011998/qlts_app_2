import React, { useMemo, useState } from "react";
import { StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";

import { useParams } from "../../hooks/useParams";
import { usePermission } from "../../hooks/usePermission";
import { useImageLoader } from "../../hooks/useImageLoader";

import { RootState } from "../../store/Index";
import { useAppDispatch } from "../../store/Hooks";
import { setShouldRefreshList } from "../../store/AssetSlice";

import { AssetAddItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import { formatDateForBE, getDefaultValueForField } from "../../utils/Date";
import { fetchImage, pickImage } from "../../utils/Image";
import { insert } from "../../services/data/CallApi";

/* ======================= HOOKS ======================= */
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useCascadeForm } from "../../hooks/AssetAddItem/useCascadeForm";
import { useTreeToForm } from "../../hooks/AssetAddItem/useTreeToForm";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useDefaultDateTime } from "../../hooks/AssetAddItem/useDefaultDateTime";
import { useAutoIncrementCode } from "../../hooks/AssetAddItem/useAutoIncrementCode";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
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
/* ===================================================== */

const BRAND_RED = ASSET_FORM_BRAND_RED;
const BG = ASSET_FORM_BG;
const CARD_SHADOW = ASSET_FORM_CARD_SHADOW;

export default function AssetAddItemDetails() {
  /* ===== PARAMS ===== */
  const { field, nameClass, propertyClass } = useParams();
  const navigation = useNavigation<AssetAddItemNavigationProp>();
  const { can } = usePermission();
  const dispatch = useAppDispatch();

  /* ===== REDUX ===== */
  const { selectedTreeValue, selectedTreeProperty } = useSelector(
    (state: RootState) => state.asset,
  );

  // ===== RAW TREE VALUES ===== //
  const rawTreeValues = useMemo(() => {
    if (!selectedTreeValue) return [];
    return selectedTreeValue.split(",").map((v) => v.trim());
  }, [selectedTreeValue]);

  /* ===== FORM CORE ===== */
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    Record<string, { items: any[]; totalCount: number }>
  >({});

  /* ===== UI STATE ===== */
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ===== IMAGE ===== */
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  /* ===== REFERENCE LOAD MORE ===== */
  const PAGE_SIZE = 20;
  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  /* ===== GROUP + FIELD ===== */
  const { fieldActive, groupedFields, collapsedGroups, toggleGroup } =
    useGroupedFields(field);

  /* ===== CASCADE ===== */
  const { handleChange } = useCascadeForm(
    fieldActive,
    setFormData,
    setReferenceData,
  );

  /* ===== TREE → FORM ===== */
  useTreeToForm({
    selectedTreeProperty,
    selectedTreeValue,
    fieldActive,
    handleChange,
    setReferenceData,
  });

  /* ===== ENUM / REFERENCE ===== */
  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  /* ===== DEFAULT DATE / TIME ===== */
  useDefaultDateTime(fieldActive, setFormData);

  /* ===== AUTO INCREMENT ===== */
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

  /* ===== IMAGE LOADER ===== */
  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  /* ===== OPEN ENUM & REFERANCE MODAL ===== */
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

  // ===== MODAL ITEMS ===== //
  const modalItems = useModalItems(
    activeEnumField,
    referenceData,
    enumData,
    formData,
  );
  const { isMounted, showAlertIfActive } = useSafeAlert();

  /* ===== SUBMIT ===== */
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

      fieldActive.forEach((f) => {
        if (f.typeProperty === TypeProperty.Date) {
          const v = payloadData[f.name];
          payloadData[f.name] = v ? formatDateForBE(v) : null;
        }
      });

      await insert(nameClass, {
        entities: [payloadData],
        saveHistory: true,
      });

      showAlertIfActive("Thành công", "Tạo mới thành công!", [
        {
          text: "OK",
          onPress: () => {
            setFormData({});
            setImages({});
            dispatch(setShouldRefreshList(true));
            navigation.goBack();
          },
        },
      ]);
    } catch {
      showAlertIfActive("Lỗi", "Không thể tạo mới!");
    } finally {
      if (isMounted()) {
        setIsSubmitting(false);
      }
    }
  };

  /* ======================= UI ======================= */
  return (
    <AssetFormScreenShell
      brandColor={BRAND_RED}
      contentContainerStyle={styles.scrollContent}
      isSubmitting={isSubmitting}
      loadingOverlayStyle={styles.loadingOverlay}
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
        iconBgColor="#FFF3F3"
        iconColor={BRAND_RED}
        iconName="add-circle-outline"
        styles={styles}
        title="Tạo tài sản mới"
        subtitle="Điền thông tin theo từng nhóm để tạo mới dữ liệu đồng bộ."
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

/* ======================= STYLE ======================= */
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
