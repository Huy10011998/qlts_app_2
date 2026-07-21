import React from "react";
import { useNetworkAwareReload } from "../../../hooks/useNetworkAwareReload";
import EnumAndReferencePickerModal from "../../modal/EnumAndReferencePickerModal";
import { TypeProperty } from "../../../utils/Enum";
import type { ReferenceDataMap } from "../../../types";

type AssetFormReferencePickerModalProps = {
  activeEnumField: any;
  formData: Record<string, any>;
  loadReferenceModalData: (
    field: any,
    options: { textSearch: string; page: number; append: boolean },
  ) => Promise<any>;
  modalItems: Array<{ value: any; text: string }>;
  modalVisible: boolean;
  referenceErrorMessage?: string | null;
  refHasMore: boolean;
  refKeyword: string;
  refLoadingMore: boolean;
  refPage: number;
  refSearching: boolean;
  isMulti?: boolean;
  referenceData: ReferenceDataMap;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setModalVisible: (visible: boolean) => void;
  setReferenceErrorMessage: (value: string | null) => void;
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
  referenceErrorMessage,
  refHasMore,
  refKeyword,
  refLoadingMore,
  refPage,
  refSearching,
  isMulti,
  referenceData,
  setFormData,
  setModalVisible,
  setReferenceErrorMessage,
  setRefHasMore,
  setRefKeyword,
  setRefLoadingMore,
  setRefPage,
  setRefSearching,
}: AssetFormReferencePickerModalProps) {
  const [showSearchingIndicator, setShowSearchingIndicator] =
    React.useState(false);
  const isReferenceField =
    activeEnumField?.typeProperty === TypeProperty.Reference;
  const realItemCount = modalItems.filter((item) => item.value !== "").length;

  React.useEffect(() => {
    if (refSearching) {
      setShowSearchingIndicator(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowSearchingIndicator(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [refSearching]);

  const retryReferenceLoad = React.useCallback(() => {
    if (!activeEnumField || refSearching) return;

    setRefSearching(true);
    setRefPage(0);
    setRefHasMore(true);

    loadReferenceModalData(activeEnumField, {
      textSearch: refKeyword,
      page: 0,
      append: false,
    }).finally(() => setRefSearching(false));
  }, [
    activeEnumField,
    loadReferenceModalData,
    refKeyword,
    refSearching,
    setRefHasMore,
    setRefPage,
    setRefSearching,
  ]);

  useNetworkAwareReload(retryReferenceLoad, {
    enabled: modalVisible && Boolean(activeEnumField),
    hasError: Boolean(referenceErrorMessage),
    onOffline: () => {
      setRefSearching(false);
      setRefLoadingMore(false);
      setReferenceErrorMessage(
        "Vui lòng kiểm tra kết nối mạng rồi thử lại.",
      );
    },
  });

  return (
    <EnumAndReferencePickerModal
      isSearching={showSearchingIndicator}
      errorMessage={referenceErrorMessage}
      loadingMore={refLoadingMore}
      visible={modalVisible}
      title={`${activeEnumField?.moTa || activeEnumField?.name}`}
      items={modalItems}
      selectedValue={activeEnumField ? formData[activeEnumField.name] : null}
      isMulti={isMulti}
      total={
        isReferenceField
          ? referenceData[activeEnumField.name]?.totalCount || 0
          : realItemCount
      }
      loadedCount={
        isReferenceField
          ? (referenceData[activeEnumField.name]?.items ?? []).filter(
              (item) => item.value !== "",
            ).length
          : realItemCount
      }
      onClose={() => setModalVisible(false)}
      onSelect={(value) => {
        if (activeEnumField) {
          const selectedValues = String(value ?? "")
            .split(",")
            .map((itemValue) => itemValue.trim())
            .filter(Boolean);
          const selectedItems = isMulti
            ? modalItems.filter((item) =>
                selectedValues.includes(String(item.value)),
              )
            : [];
          const selectedItem = modalItems.find(
            (item) => String(item.value) === String(value),
          );
          let finalValue = value;

          if (!isMulti && value !== "" && !isNaN(value)) {
            finalValue = Number(value);
          }

          handleChange(activeEnumField.name, finalValue);
          setFormData((prev) => ({
            ...prev,
            [`${activeEnumField.name}_MoTa`]:
              value === ""
                ? ""
                : isMulti
                ? selectedItems.map((item) => item.text).join(", ") ||
                  String(value)
                : selectedItem?.text ?? String(value),
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
        }).then((result) => {
          if (result !== "error") {
            setRefPage((prev) => prev + 1);
          }
        }).finally(() => {
          setRefLoadingMore(false);
        });
      }}
    />
  );
}
