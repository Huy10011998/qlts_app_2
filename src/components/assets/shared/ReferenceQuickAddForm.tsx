import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  checkValidation,
  getFieldActive,
  getPropertyClass,
  insert,
  tuDongTang,
} from "../../../services";
import type { Field, PropertyResponse } from "../../../types";
import { TypeProperty } from "../../../utils/Enum";
import { formatDateForBE } from "../../../utils/Date";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../../../utils/helpers/api";
import { isEffectivelyEmptyCodeValue } from "../../../utils/helpers/string";
import { fetchImage, pickImage } from "../../../utils/Image";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { log } from "../../../utils/Logger";

import { useAssetFormState } from "../../../hooks/AssetAddItem/useAssetFormState";
import { useCascadeForm } from "../../../hooks/AssetAddItem/useCascadeForm";
import { useEnumAndReferenceLoader } from "../../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useGroupedFields } from "../../../hooks/AssetAddItem/useGroupedFields";
import { useModalItems } from "../../../hooks/AssetAddItem/useModalItems";
import { useOpenReferenceModal } from "../../../hooks/AssetAddItem/useOpenReferenceModal";
import { useFieldDefaults } from "../../../hooks/AssetAddItem/useFieldDefaults";
import { stripReadOnlyFields } from "./assetFormPayload";
import { useImageLoader } from "../../../hooks/useImageLoader";
import { useSafeAlert } from "../../../hooks/useSafeAlert";

import AssetFormGroupedFields from "./AssetFormGroupedFields";
import AssetFormReferencePickerModal from "./AssetFormReferencePickerModal";
import IsLoading from "../../ui/IconLoading";
import EmptyState from "../../ui/EmptyState";
import { createAssetFormBaseStyles } from "./assetFormStyles";
import {
  getRequiredFieldErrors,
  getRequiredFieldsMessage,
} from "./assetFormValidation";

type ClassConfig = {
  fieldActive: Field[];
  propertyClass?: PropertyResponse;
};

/**
 * Cấu hình class không đổi trong một phiên dùng app, mà cùng một danh mục được
 * mở thêm nhanh nhiều lần từ nhiều field khác nhau — cache ở cấp module để lần
 * mở sau không phải chờ mạng.
 */
const classConfigCache = new Map<string, ClassConfig>();

/** Dọn cache — chỉ dùng cho test. */
export const resetQuickAddConfigCache = () => classConfigCache.clear();

/**
 * Bóc id bản ghi vừa tạo từ response `insert`. Chưa có chỗ nào trong app dùng
 * giá trị trả về của `insert` nên hình dạng response không chắc; thử lần lượt
 * các dạng hay gặp và chịu được việc không tìm ra (lúc đó chỉ tải lại danh sách,
 * người dùng tự chọn).
 */
export const extractInsertedId = (response: unknown): number | null => {
  const data = (response as any)?.data ?? response;

  const candidates = [
    data?.entities?.[0]?.id,
    data?.entities?.[0],
    Array.isArray(data) ? data[0]?.id : undefined,
    Array.isArray(data) ? data[0] : undefined,
    data?.id,
    data,
  ];

  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) return id;
  }

  return null;
};

type ReferenceQuickAddFormProps = {
  /** Class đích — chính là `type` gửi cho `get-category` của field reference. */
  nameClass: string;
  /** Nhãn field đang chọn, chỉ dùng cho câu thông báo. */
  fieldLabel?: string;
  /**
   * Chuỗi cấp cha của chính ô combobox đang mở, dạng `{ tênCột: id }`.
   *
   * Đang chọn Room ở form ngoài thì Complex/Building/Unit đã chọn được truyền
   * xuống đây để điền sẵn — bản ghi mới nằm đúng cha nên hiện ngay trong danh
   * sách sau khi tạo (danh sách đó vẫn bị `lstParent` của cha lọc).
   * Web làm y vậy ở `DataClass_CheckSelectDialog`.
   */
  prefilledValues?: Record<string, number>;
  /** Nhãn của các cấp cha, để ô prefill hiện tên chứ không trơ số ID. */
  prefilledLabels?: Record<string, string>;
  title: string;
  /** Quay lại danh sách chọn. */
  onCancel: () => void;
  onCreated: (createdId: number | null) => void;
};

/**
 * Form thêm nhanh một bản ghi của class được reference tới, hiển thị ngay trong
 * sheet chọn dữ liệu.
 *
 * Bày đủ field và nhóm y như màn thêm mới của chính class đó — "nhanh" ở đây là
 * không phải rời form đang nhập, chứ không phải cắt bớt trường.
 */
export default function ReferenceQuickAddForm({
  nameClass,
  fieldLabel,
  title,
  prefilledValues,
  prefilledLabels,
  onCancel,
  onCreated,
}: ReferenceQuickAddFormProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const { isActive, isMounted, showAlertIfActive } = useSafeAlert();

  const [config, setConfig] = React.useState<ClassConfig | null>(
    () => classConfigCache.get(nameClass) ?? null,
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    activeEnumField,
    enumData,
    formData,
    images,
    loadingImages,
    modalVisible,
    pageSize,
    refHasMore,
    refKeyword,
    refLoadingMore,
    refPage,
    refSearching,
    referenceData,
    referenceErrorMessage,
    setActiveEnumField,
    setEnumData,
    setFormData,
    setImages,
    setLoadingImages,
    setModalVisible,
    setRefHasMore,
    setRefKeyword,
    setRefLoadingMore,
    setRefPage,
    setRefSearching,
    setReferenceData,
    setReferenceErrorMessage,
    setValidationErrors,
    validationErrors,
  } = useAssetFormState();

  const loadConfig = React.useCallback(async () => {
    const cached = classConfigCache.get(nameClass);
    if (cached) {
      setConfig(cached);
      setLoadError(null);
      return;
    }

    setLoadError(null);

    try {
      const [resField, resProperty] = await Promise.all([
        getFieldActive(nameClass),
        getPropertyClass(nameClass),
      ]);

      const nextConfig: ClassConfig = {
        fieldActive: Array.isArray(resField?.data) ? resField.data : [],
        propertyClass: resProperty?.data,
      };

      classConfigCache.set(nameClass, nextConfig);
      if (!isMounted()) return;

      setConfig(nextConfig);
    } catch (error) {
      log("[ReferenceQuickAddForm] load config error:", error);
      if (!isMounted()) return;

      setLoadError("Không tải được cấu hình danh mục. Vui lòng thử lại.");
    }
  }, [isMounted, nameClass]);

  React.useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  /* Field và cách nhóm giống hệt màn thêm mới — cùng `useGroupedFields` nên
     nhóm, thứ tự và việc gập nhóm không lệch giữa hai nơi. */
  const {
    fieldActive,
    groupedFields,
    collapsedGroups,
    toggleGroup,
    expandGroupsWithErrors,
  } = useGroupedFields(config?.fieldActive);

  const { handleChange: baseHandleChange } = useCascadeForm(
    fieldActive,
    setFormData,
    setReferenceData,
  );

  /* Giá trị của các field prefill cấp cha, giữ trong ref để chốt lại được sau
     khi cascade chạy — xem `handleChange` dưới. */
    const lockedValuesRef = React.useRef<Record<string, any>>({});

  const handleChange = React.useCallback(
    (name: string, value: any) => {
      // Field đã khoá thì không nhận thay đổi, kể cả gọi thẳng từ code.
      if (name in lockedValuesRef.current) return;

      setValidationErrors((prev) => {
        if (!prev[name]) return prev;

        const next = { ...prev };
        delete next[name];
        return next;
      });

      baseHandleChange(name, value);

      /* Cascade xoá MỌI field con của field vừa đổi. Field prefill có thể là con
         của một field khác trong class đích, và bị xoá thì nó vừa khoá vừa rỗng —
         người dùng không sửa được, mà bản ghi lưu ra không thuộc cha nào. Chốt
         lại ngay sau cascade. */
      if (Object.keys(lockedValuesRef.current).length) {
        setFormData((prev) => ({ ...prev, ...lockedValuesRef.current }));
      }
    },
    [baseHandleChange, setFormData, setValidationErrors],
  );

  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  useFieldDefaults(fieldActive, setFormData);

  /* Điền sẵn chuỗi cấp cha, SAU default để ghi đè nếu trùng tên field — đúng
     thứ tự web đang làm (default từ field, rồi bộ cặp cấp cha).
     Lọc theo `fieldActive` của class ĐÍCH: `parentsFields` là tên cột trên
     class đang nhập, không chắc trùng tên cột ở đây.
     Điền qua `handleChange` theo đúng thứ tự khai để cascade chạy — set thẳng
     `setFormData` thì ô con của cấp prefill sẽ không có danh mục. */
  const prefillDoneRef = React.useRef(false);
  const [lockedFields, setLockedFields] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    if (prefillDoneRef.current) return;
    if (!fieldActive.length) return;

    prefillDoneRef.current = true;

    const applicable = Object.keys(prefilledValues ?? {}).filter((name) =>
      fieldActive.some((field) => field.name === name),
    );

    if (!applicable.length) return;

    applicable.forEach((name) => {
      handleChange(name, prefilledValues![name]);

      const label = prefilledLabels?.[name];
      if (label) {
        setFormData((prev) => ({ ...prev, [`${name}_MoTa`]: label }));
      }
    });

    /* Chốt khoá SAU khi điền: `handleChange` chặn field đã khoá, ghi ref trước
       là chính vòng lặp prefill không điền được gì. */
    applicable.forEach((name) => {
      lockedValuesRef.current[name] = prefilledValues![name];
    });
    setLockedFields(new Set(applicable));
  }, [
    fieldActive,
    handleChange,
    prefilledLabels,
    prefilledValues,
    setFormData,
  ]);

  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  /* Mã tự động: chỉ sinh một lần lúc mở form, và phải CHỜ prefill cấp cha xong —
     sinh trước thì mã ra theo cha rỗng, mà sai kiểu đó vẫn lưu được, không báo
     lỗi gì. */
  const autoCodeField = config?.propertyClass?.propertyTuDongTang;
  const autoCodeRequestedRef = React.useRef(false);
  const autoCodeParentField = config?.propertyClass?.prentTuDongTang;
  const autoCodeParentValue = autoCodeParentField
    ? prefilledValues?.[autoCodeParentField]
    : undefined;

  React.useEffect(() => {
    if (autoCodeRequestedRef.current) return;
    if (!config?.propertyClass?.isTuDongTang || !autoCodeField) return;
    if (!prefillDoneRef.current) return;

    autoCodeRequestedRef.current = true;

    tuDongTang(nameClass, {
      propertyTuDongTang: autoCodeField,
      formatTuDongTang: config.propertyClass.formatTuDongTang,
      prentTuDongTang: config.propertyClass.prentTuDongTang,
      prentTuDongTang_Value:
        autoCodeParentValue != null ? String(autoCodeParentValue) : "",
      prefix: config.propertyClass.prefix,
    })
      .then((res) => {
        if (!res?.data || !isMounted()) return;

        setFormData((prev) => ({ ...prev, [autoCodeField]: res.data }));
      })
      .catch((error) => {
        log("[ReferenceQuickAddForm] auto code error:", error);
      });
  }, [
    autoCodeField,
    autoCodeParentValue,
    config?.propertyClass,
    isMounted,
    lockedFields,
    nameClass,
    setFormData,
  ]);

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
    pageSize,
  });

  const modalItems = useModalItems(
    activeEnumField,
    referenceData,
    enumData,
    formData,
  );

  const handleSubmit = async () => {
    const requiredErrors = getRequiredFieldErrors(fieldActive, formData);

    if (Object.keys(requiredErrors).length) {
      setValidationErrors((prev) => ({ ...prev, ...requiredErrors }));
      expandGroupsWithErrors(requiredErrors);
      showAlertIfActive(
        "Thiếu thông tin",
        getRequiredFieldsMessage(fieldActive, requiredErrors),
      );
      return;
    }

    let payload: Record<string, any> = { ...formData };

    Object.keys(payload).forEach((key) => {
      if (key.endsWith("_MoTa")) delete payload[key];
    });

    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Date) {
        const value = payload[f.name];
        payload[f.name] = value ? formatDateForBE(value) : null;
      }
    });

    if (autoCodeField && isEffectivelyEmptyCodeValue(payload[autoCodeField])) {
      payload[autoCodeField] = null;
    }

    /* Mục 4b: không gửi field isReadOnly. Chừa cột mã tự tăng và các cột prefill
       chuỗi cấp cha — bỏ chúng là bản ghi danh mục mới không thuộc cha nào. */
    payload = stripReadOnlyFields(fieldActive, payload, [
      autoCodeField,
      ...lockedFields,
    ]);

    if (!Object.keys(payload).length) {
      showAlertIfActive("Thông báo", "Vui lòng nhập ít nhất một trường!");
      return;
    }

    try {
      setIsSubmitting(true);

      await checkValidation(nameClass, { data: payload, id: 0 });

      const response = await insert(nameClass, {
        entities: [payload],
        saveHistory: true,
      });

      const createdId = extractInsertedId(response);
      const finish = () => onCreated(createdId);

      /* Báo thành công rồi mới quay về danh sách, giống màn thêm mới — không có
         nhịp này thì sheet đổi nội dung một cái và người dùng không chắc là đã
         lưu được. Alert không hiện được (màn mất focus / vừa unmount) thì đi
         luôn, không để kẹt lại ở form. */
      if (!isActive()) {
        finish();
        return;
      }

      Alert.alert("Thành công", "Tạo mới thành công!", [
        { text: "OK", onPress: finish },
      ]);
    } catch (error: any) {
      setValidationErrors(getApiValidationFieldErrors(error));
      showAlertIfActive("Lỗi", getApiErrorMessage(error, "Không thể tạo mới!"));
    } finally {
      if (isMounted()) setIsSubmitting(false);
    }
  };

  /* Header là của form chứ không phải của sheet: nút Lưu phải nằm cùng hàng tiêu
     đề, mà trạng thái đang lưu thì chỉ form biết. Header luôn hiện — kể cả lúc
     đang tải hay lỗi — để đường quay lại danh sách không bao giờ mất. */
  const renderBody = () => {
    if (loadError) {
      return (
        <View style={styles.centerBlock}>
          <EmptyState
            iconName="cloud-offline-outline"
            title="Không tải được cấu hình"
            subtitle={loadError}
          />

          <TouchableOpacity style={styles.retryButton} onPress={loadConfig}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.submitText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!config) {
      return (
        <View style={styles.centerBlock}>
          <IsLoading size="small" />
        </View>
      );
    }

    if (!fieldActive.length) {
      return (
        <View style={styles.centerBlock}>
          <EmptyState
            iconName="alert-circle-outline"
            title="Không thêm nhanh được"
            subtitle={`Danh mục ${
              fieldLabel || nameClass
            } không có trường nào nhập được.`}
          />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AssetFormGroupedFields
          collapsedGroups={collapsedGroups}
          enumData={enumData}
          formData={formData}
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
          lockedFields={lockedFields}
        />
      </ScrollView>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={10}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách"
        >
          <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        {config && fieldActive.length ? (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Lưu"
          >
            {/* Vòng xoay đặt thẳng ActivityIndicator, không qua `IsLoading`: bọc
                ngoài của nó có `flex: 1` nên trong nút một hàng nó ăn hết chỗ
                trống và đẩy chữ "Lưu" sát lề phải. */}
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color="#fff"
              />
            )}
            <Text style={styles.submitText}>Lưu</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {renderBody()}

      {/* Picker của chính form này. `enableQuickAdd={false}`: thêm nhanh chỉ đi
          một cấp, không lồng vô tận. */}
      <AssetFormReferencePickerModal
        enableQuickAdd={false}
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
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...createAssetFormBaseStyles(c),
    wrap: {
      flex: 1,
      minHeight: 0,
    },
    body: {
      flex: 1,
      minHeight: 0,
    },
    bodyContent: {
      paddingBottom: 8,
    },
    centerBlock: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 12,
    },
    backButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    /* Lưu nằm sát lề phải header: không có nút Hủy nữa nên đây là nút duy nhất,
       và ở header thì cuộn form bao xa nó vẫn trong tầm ngón tay. */
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: c.red,
    },
    submitDisabled: {
      opacity: 0.6,
    },
    submitText: {
      fontSize: 13.5,
      fontWeight: "700",
      color: "#fff",
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: c.red,
    },
  });
