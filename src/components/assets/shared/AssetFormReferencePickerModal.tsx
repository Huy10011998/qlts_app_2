import React from "react";
import EnumAndReferencePickerModal from "../../modal/EnumAndReferencePickerModal";

type AssetFormReferencePickerModalProps = {
  activeEnumField: any;
  formData: Record<string, any>;
  loadReferenceModalData: (
    field: any,
    options: { textSearch: string; page: number; append: boolean },
  ) => Promise<any>;
  modalItems: Array<{ value: any; text: string }>;
  modalVisible: boolean;
  refHasMore: boolean;
  refKeyword: string;
  refLoadingMore: boolean;
  refPage: number;
  refSearching: boolean;
  referenceData: Record<string, { items: any[]; totalCount: number }>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setModalVisible: (visible: boolean) => void;
  setRefHasMore: (value: boolean) => void;
  setRefKeyword: (value: string) => void;
  setRefLoadingMore: (value: boolean) => void;
  setRefPage: React.Dispatch<React.SetStateAction<number>>;
  setRefSearching: (value: boolean) => void;
  handleChange: (name: string, value: any) => void;
};

export default function AssetFormReferencePickerModal({
  activeEnumField,
  formData,
  handleChange,
  loadReferenceModalData,
  modalItems,
  modalVisible,
  refHasMore,
  refKeyword,
  refLoadingMore,
  refPage,
  refSearching,
  referenceData,
  setFormData,
  setModalVisible,
  setRefHasMore,
  setRefKeyword,
  setRefLoadingMore,
  setRefPage,
  setRefSearching,
}: AssetFormReferencePickerModalProps) {
  return (
    <EnumAndReferencePickerModal
      isSearching={refSearching}
      loadingMore={refLoadingMore}
      visible={modalVisible}
      title={`${activeEnumField?.moTa || activeEnumField?.name}`}
      items={modalItems}
      selectedValue={activeEnumField ? formData[activeEnumField.name] : null}
      total={
        activeEnumField ? referenceData[activeEnumField.name]?.totalCount || 0 : 0
      }
      loadedCount={
        activeEnumField
          ? (referenceData[activeEnumField.name]?.items ?? []).filter(
              (item) => item.value !== "",
            ).length
          : 0
      }
      onClose={() => setModalVisible(false)}
      onSelect={(value) => {
        if (activeEnumField) {
          const selectedItem = modalItems.find(
            (item) => String(item.value) === String(value),
          );
          let finalValue = value;

          if (value !== "" && !isNaN(value)) {
            finalValue = Number(value);
          }

          handleChange(activeEnumField.name, finalValue);
          setFormData((prev) => ({
            ...prev,
            [`${activeEnumField.name}_MoTa`]:
              value === "" ? "" : selectedItem?.text ?? String(value),
          }));
        }

        setModalVisible(false);
      }}
      onSearch={(textSearch) => {
        if (!activeEnumField) return;

        setRefSearching(true);
        setRefKeyword(textSearch);
        setRefPage(0);
        setRefHasMore(true);

        loadReferenceModalData(activeEnumField, {
          textSearch,
          page: 0,
          append: false,
        }).finally(() => setRefSearching(false));
      }}
      onLoadMore={() => {
        if (!activeEnumField || refLoadingMore || refSearching || !refHasMore) {
          return;
        }

        const fieldName = activeEnumField.name;
        const ref = referenceData[fieldName];

        if (!ref) return;
        if (ref.totalCount <= ref.items.length) {
          setRefHasMore(false);
          return;
        }

        setRefLoadingMore(true);

        loadReferenceModalData(activeEnumField, {
          textSearch: refKeyword,
          page: refPage + 1,
          append: true,
        }).finally(() => {
          setRefPage((prev) => prev + 1);
          setRefLoadingMore(false);
        });
      }}
    />
  );
}
