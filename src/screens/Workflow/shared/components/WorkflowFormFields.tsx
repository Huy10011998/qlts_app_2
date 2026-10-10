import React from "react";

import AssetFormGroupedFields from "../../../../components/assets/shared/AssetFormGroupedFields";
import AssetFormReferencePickerModal from "../../../../components/assets/shared/AssetFormReferencePickerModal";
import type { WorkflowDynamicForm } from "../useWorkflowDynamicForm";

type FieldsProps = {
  form: WorkflowDynamicForm;
  /** Bộ style của form tài sản (`createAssetFormBaseStyles`). */
  styles: any;
  lockedFields?: Set<string>;
};

/** Phần động của form: nhóm theo groupLayout, nhãn / bắt buộc theo metadata. */
export function WorkflowFormFields({ form, styles, lockedFields }: FieldsProps) {
  return (
    <AssetFormGroupedFields
      collapsedGroups={form.collapsedGroups}
      enumData={form.enumData}
      formData={form.formData}
      groupedFields={form.groupedFields}
      handleChange={form.handleChange}
      images={form.images}
      loadingImages={form.loadingImages}
      mode={form.mode}
      openReferenceModal={form.openReferenceModal}
      pickImage={form.pickImage}
      referenceData={form.referenceData}
      validationErrors={form.validationErrors}
      setImages={form.setImages}
      setLoadingImages={form.setLoadingImages}
      styles={styles}
      toggleGroup={form.toggleGroup}
      lockedFields={lockedFields}
    />
  );
}

/** Modal chọn Reference / Enum của phần động — đặt vào prop `modal` của khung form. */
export function WorkflowFormPickerModal({ form }: { form: WorkflowDynamicForm }) {
  return (
    <AssetFormReferencePickerModal
      activeEnumField={form.activeEnumField}
      formData={form.formData}
      handleChange={form.handleChange}
      loadReferenceModalData={form.loadReferenceModalData}
      modalItems={form.modalItems}
      modalVisible={form.modalVisible}
      referenceErrorMessage={form.referenceErrorMessage}
      refHasMore={form.refHasMore}
      refKeyword={form.refKeyword}
      refLoadingMore={form.refLoadingMore}
      refPage={form.refPage}
      refSearching={form.refSearching}
      referenceData={form.referenceData}
      setFormData={form.setFormData}
      setModalVisible={form.setModalVisible}
      setReferenceErrorMessage={form.setReferenceErrorMessage}
      setRefHasMore={form.setRefHasMore}
      setRefKeyword={form.setRefKeyword}
      setRefLoadingMore={form.setRefLoadingMore}
      setRefPage={form.setRefPage}
      setRefSearching={form.setRefSearching}
      enableQuickAdd={false}
    />
  );
}
