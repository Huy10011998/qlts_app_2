import { useCallback, useEffect, useMemo } from "react";

import { useAssetFormState } from "../../../hooks/AssetAddItem/useAssetFormState";
import { useCascadeForm } from "../../../hooks/AssetAddItem/useCascadeForm";
import { useEnumAndReferenceLoader } from "../../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useFieldDefaults } from "../../../hooks/AssetAddItem/useFieldDefaults";
import { useGroupedFields } from "../../../hooks/AssetAddItem/useGroupedFields";
import { useModalItems } from "../../../hooks/AssetAddItem/useModalItems";
import { useOpenReferenceModal } from "../../../hooks/AssetAddItem/useOpenReferenceModal";
import {
  getRequiredFieldErrors,
  getRequiredFieldsMessage,
} from "../../../components/assets/shared/assetFormValidation";
import { fetchReferenceByFieldWithParent } from "../../../utils/cascade/FetchReferenceByFieldWithParent";
import { getParentGate } from "../../../utils/cascade/parentGate";
import { TypeProperty } from "../../../utils/Enum";
import { pickImage } from "../../../utils/Image";
import type { Field } from "../../../types/index";
import type { WorkflowField } from "./workflowFields";

const NO_FIELDS: Field[] = [];

export type WorkflowFormMode = "add" | "edit" | "clone";

/**
 * Bộ form động của view Workflow, ghép từ các hook của form tài sản
 * (`src/hooks/AssetAddItem/`) theo đúng khuôn `AssetAddItemDetails`. Phần lưu
 * KHÔNG nằm ở đây — mỗi nghiệp vụ gọi API riêng (insert-out-id, cv-them...).
 *
 * `initialData` là giá trị khởi tạo (dòng đang sửa, hoặc giá trị điền sẵn khi
 * thêm: field hệ thống của phiếu, ngày chọn trên lịch...). Truyền object đã
 * memo — mỗi lần tham chiếu đổi là ghi đè lại vào form.
 */
export function useWorkflowDynamicForm(
  fields: WorkflowField[],
  initialData: Record<string, any> | null,
  mode: WorkflowFormMode,
) {
  const state = useAssetFormState();
  const {
    activeEnumField,
    enumData,
    formData,
    pageSize,
    referenceData,
    setActiveEnumField,
    setEnumData,
    setFormData,
    setModalVisible,
    setRefHasMore,
    setRefKeyword,
    setRefPage,
    setReferenceData,
    setReferenceErrorMessage,
    setValidationErrors,
    validationErrors,
  } = state;

  const grouped = useGroupedFields(fields);
  const { fieldActive } = grouped;

  // Khởi tạo TRƯỚC `useFieldDefaults`: default chỉ điền vào key chưa có, nên
  // giá trị điền sẵn của ngữ cảnh luôn thắng default của metadata.
  useEffect(() => {
    if (!initialData) return;
    setFormData((prev) => ({ ...prev, ...initialData }));
  }, [initialData, setFormData]);

  useFieldDefaults(mode === "add" ? fieldActive : NO_FIELDS, setFormData);

  const { handleChange: cascadeChange } = useCascadeForm(
    fieldActive,
    setFormData,
    setReferenceData,
  );

  const handleChange = useCallback(
    (name: string, value: any) => {
      setValidationErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
      cascadeChange(name, value);
    },
    [cascadeChange, setValidationErrors],
  );

  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  /* Ô chọn có cấp cha mà cha đã có giá trị từ lúc khởi tạo (ID_LoaiFlow có cha
     ID_Flow = flow.id, không bao giờ đổi qua handleChange): nạp danh mục theo
     cha. Khoá theo chuỗi giá trị cha để không gọi lại mỗi lần gõ phím ở ô khác
     — `useCascadeParentReload` của form tài sản chạy theo cả `formData`. */
  const parentKey = useMemo(
    () =>
      fieldActive
        .filter(
          (field) =>
            field.typeProperty === TypeProperty.Reference &&
            field.parentsFields &&
            field.referenceName,
        )
        .map((field) => `${field.name}=${getParentGate(field, formData).lstParent ?? ""}`)
        .join("|"),
    [fieldActive, formData],
  );

  useEffect(() => {
    if (!parentKey) return;

    fieldActive.forEach((field) => {
      if (field.typeProperty !== TypeProperty.Reference) return;
      if (!field.parentsFields || !field.referenceName) return;

      const gate = getParentGate(field, formData);
      if (!gate.isReady) return;

      fetchReferenceByFieldWithParent(
        field.referenceName,
        field.name,
        gate.lstParent!,
        setReferenceData,
      );
    });
    // Chỉ chạy lại khi giá trị cha đổi (parentKey), không theo từng phím gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentKey]);

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
    state.refKeyword,
  );

  /** Kiểm ô bắt buộc; thiếu thì đánh dấu lỗi, mở nhóm có lỗi, trả câu báo. */
  const validateRequired = useCallback((): string | null => {
    const errors = getRequiredFieldErrors(fieldActive, formData);
    if (!Object.keys(errors).length) return null;

    setValidationErrors((prev) => ({ ...prev, ...errors }));
    grouped.expandGroupsWithErrors(errors);
    return getRequiredFieldsMessage(fieldActive, errors);
  }, [fieldActive, formData, grouped, setValidationErrors]);

  return {
    ...state,
    ...grouped,
    mode,
    handleChange,
    openReferenceModal,
    loadReferenceModalData,
    modalItems,
    validateRequired,
    validationErrors,
    pickImage,
  };
}

export type WorkflowDynamicForm = ReturnType<typeof useWorkflowDynamicForm>;
