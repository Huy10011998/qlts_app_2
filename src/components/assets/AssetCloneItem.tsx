import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import type {
  AssetCloneItemNavigationProp,
  Field,
  ReferenceDataMap,
} from "../../types/index";
import { TypeProperty } from "../../utils/Enum";
import { getMatchedKey } from "../../utils/Helper";
import { parseCsv } from "../../utils/helpers/string";
import { useParams } from "../../hooks/useParams";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../../utils/helpers/api";
import { fetchImage, pickImage } from "../../utils/Image";
import { isEffectivelyEmptyCodeValue } from "../../utils/helpers/string";
import { AppColors, useStyles } from "../../utils/helpers/colors";
import { useCascadeParentReload } from "../../hooks/AssetAddItem/useCascadeParentReload";
import { handleCascadeChange } from "../../utils/cascade/index";
import { useImageLoader } from "../../hooks/useImageLoader";
import { StackActions, useNavigation } from "@react-navigation/native";
import { setShouldRefreshList } from "../../store/AssetSlice";

import {
  formatDateForBE,
  normalizeDateFromBE,
} from "../../utils/Date";

import { checkValidation, insert } from "../../services/data/callApi";
import { useAppDispatch } from "../../store/hooks";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useAutoIncrementCode } from "../../hooks/AssetAddItem/useAutoIncrementCode";
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
  normalizeBase64ImageFields,
  stripReadOnlyFields,
} from "./shared/assetFormPayload";
import { createAssetFormBaseStyles } from "./shared/assetFormStyles";
import { ASSET_FORM_BRAND_RED } from "./shared/assetFormTheme";
import {
  backToAssetList,
  backToAssetRelatedList,
} from "../../navigation/shared/assetNavigationReset";
import { AppAlert } from "../ui/AppAlert";

const BRAND_RED = ASSET_FORM_BRAND_RED;

export default function AssetCloneItem() {
  const styles = useStyles(makeStyles);
  const {
    item,
    field,
    propertyClass,
    nameClass,
    returnTo,
    idRoot,
    propertyReference,
    nameClassRoot,
    rootRecordLabel,
    titleHeader,
    groupMenuId,
    viewPermission,
    assetTitleHeader,
  } = useParams();
  const navigation = useNavigation<AssetCloneItemNavigationProp>();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState<Record<string, any>>({});

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
  const submittingRef = useRef(false);

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

  const { selectedTreeValue } = useSelector((state: RootState) => state.asset);

  const rawTreeValues = useMemo(() => {
    if (!selectedTreeValue) return [];
    return parseCsv(selectedTreeValue);
  }, [selectedTreeValue]);

  const {
    fieldActive,
    groupedFields,
    collapsedGroups,
    toggleGroup,
    expandGroupsWithErrors,
  } = useGroupedFields(field);

  const didInitRef = useRef(false);
  useEffect(() => {
    const initial: Record<string, any> = {};

    if (didInitRef.current) return;
    didInitRef.current = true;

    const autoField = propertyClass?.propertyTuDongTang;

    fieldActive.forEach((f) => {
      const name = f.name;

      if (name === autoField) {
        return;
      }

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
        case TypeProperty.Enum:
          initial[name] =
            raw !== undefined && raw !== null && raw !== "" ? raw : "";
          if (f.typeProperty === TypeProperty.Enum) {
            initial[`${name}_MoTa`] = rawText ?? "";
          }
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
  }, [fieldActive, item, propertyClass?.propertyTuDongTang]);

  const { pendingEnumFields } = useEnumAndReferenceLoader(
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

  /* Hỏi "Bỏ thay đổi?" khi rời bản sao đã sửa dở. Form điền sẵn từ bản ghi gốc
     nên mở ra rồi thoát ngay không phải là "có thay đổi" — chỉ thao tác tay mới
     đánh dấu. */
  const { isDirty, markUserEdit } = useAssetFormDirty(formData);
  const { leaveWithoutPrompt } = useUnsavedChangesGuard(isDirty);

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
  );
  const { isMounted, showAlertIfActive } = useSafeAlert();

  const handleClone = async () => {
    if (submittingRef.current) return;

    if (!Object.keys(formData).length) {
      AppAlert.alert("Thông báo", "Không có dữ liệu để clone!");
      return;
    }

    if (!nameClass) {
      AppAlert.alert("Lỗi", "Không xác định được danh mục!");
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

    let saved = false;

    try {
      submittingRef.current = true;
      setIsSubmitting(true);

      const payloadData: Record<string, any> = { ...formData };
      ["id", "ID", "Id"].forEach(
        (k) => payloadData[k] && delete payloadData[k],
      );
      payloadData.id = 0;
      fieldActive.forEach((f) => {
        const key = f.name;
        const value = payloadData[key];

        switch (f.typeProperty) {
          case TypeProperty.Date:
            payloadData[key] = value ? formatDateForBE(value) : null;
            break;

          case TypeProperty.Int:
          case TypeProperty.Decimal:
            payloadData[key] =
              value !== "" && value !== null ? Number(value) : null;
            break;

          case TypeProperty.Image:
            payloadData[key] = value === "" || value === "---" ? null : value;
            break;

          default:
            payloadData[key] = value === "" ? null : value;
        }
      });
      Object.keys(payloadData).forEach(
        (k) => k.endsWith("_MoTa") && delete payloadData[k],
      );

      const autoCodeField = propertyClass?.propertyTuDongTang;
      if (
        autoCodeField &&
        isEffectivelyEmptyCodeValue(payloadData[autoCodeField])
      ) {
        payloadData[autoCodeField] = null;
      }

      /* Mục 4b: không gửi field isReadOnly. Lưu ý hệ quả ở bản sao — cột
         readonly copy từ dòng gốc sẽ về NULL, server tự tính lại. */
      const entity = stripReadOnlyFields(
        fieldActive,
        normalizeBase64ImageFields(fieldActive, payloadData),
        [
          autoCodeField,
        ],
      );

      const payload = {
        entities: [entity],
        saveHistory: true,
      };

      await checkValidation(nameClass, {
        data: entity,
        id: 0,
      });

      await insert(nameClass, payload);
      saved = true;

      dispatch(setShouldRefreshList(true));
      // Dải toast nằm ở gốc app nên vẫn hiện sau khi màn này đóng — khỏi bắt
      // bấm OK cho mỗi bản ghi.
      showAppToast({ message: "Đã tạo bản sao" });

      // Người dùng đã rời màn trong lúc chờ lưu thì không kéo họ đi đâu nữa.
      if (!isMounted()) return;

      setFormData({});
      setImages({});

      leaveWithoutPrompt(() => {
        if (returnTo === "qrReview") {
          navigation.dispatch(StackActions.pop(2));
          return;
        }

        if (
          returnTo === "assetRelatedList" &&
          nameClass &&
          idRoot &&
          propertyReference
        ) {
          backToAssetRelatedList(navigation, {
            assetContext: {
              groupMenuId,
              viewPermission,
              assetTitleHeader,
            },
            relatedListParams: {
              nameClass,
              idRoot,
              propertyReference,
              nameClassRoot,
              rootRecordLabel,
              titleHeader,
              groupMenuId,
              viewPermission,
              assetTitleHeader,
            },
          });
          return;
        }

        backToAssetList(navigation, {
          assetContext: {
            groupMenuId,
            viewPermission,
            assetTitleHeader,
          },
          listParams: {
            nameClass,
            titleHeader,
            groupMenuId,
            viewPermission,
            assetTitleHeader,
          },
        });
      });
    } catch (err: any) {
      setValidationErrors(getApiValidationFieldErrors(err));
      showAlertIfActive(
        "Lỗi",
        getApiErrorMessage(err, "Không thể tạo bản sao!"),
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

  const handleCloneRef = React.useRef(handleClone);
  handleCloneRef.current = handleClone;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: createAssetFormHeaderSubmitRight({
        disabled: isSubmitting,
        iconName: "copy-outline",
        label: "Bản sao",
        onPress: () => handleCloneRef.current(),
      }),
    });
  }, [isSubmitting, navigation]);

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
        mode="clone"
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
