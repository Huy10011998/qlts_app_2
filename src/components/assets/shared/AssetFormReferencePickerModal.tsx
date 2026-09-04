import React from "react";
import { useNetworkAwareReload } from "../../../hooks/useNetworkAwareReload";
import { usePermission } from "../../../hooks/usePermission";
import EnumAndReferencePickerModal from "../../modal/EnumAndReferencePickerModal";
import { TypeProperty } from "../../../utils/Enum";
import type { ReferenceDataMap } from "../../../types";
import ReferenceQuickAddForm from "./ReferenceQuickAddForm";
import { getParentGate } from "../../../utils/cascade/parentGate";
import { buildQuickAddPrefill } from "./assetFormPayload";

type AssetFormReferencePickerModalProps = {
  activeEnumField: any;
  formData: Record<string, any>;
  loadReferenceModalData: (
    field: any,
    options: {
      textSearch: string;
      page: number;
      append: boolean;
      currentIds?: Array<string | number>;
    },
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
  /**
   * Cho phép đường tắt "thêm nhanh" bản ghi của class được reference tới. Tắt ở
   * picker nằm trong chính form thêm nhanh, để không lồng thêm cấp nữa.
   */
  enableQuickAdd?: boolean;
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
  enableQuickAdd = true,
}: AssetFormReferencePickerModalProps) {
  const [showSearchingIndicator, setShowSearchingIndicator] =
    React.useState(false);
  const isReferenceField =
    activeEnumField?.typeProperty === TypeProperty.Reference;
  const realItemCount = modalItems.filter((item) => item.value !== "").length;
  const { can } = usePermission();
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  /* Class đích của thêm nhanh chính là `type` mà picker gửi cho `get-category`,
     tức `referenceName` của field. Cửa duy nhất là quyền
     `Class.{referenceName}.Insert`: `referenceName` không phải class thật thì
     quyền không bao giờ khớp và nút cũng không hiện. */
  const quickAddNameClass = isReferenceField
    ? String(activeEnumField?.referenceName ?? "").trim()
    : "";
  const canQuickAdd = Boolean(
    enableQuickAdd && quickAddNameClass && can(quickAddNameClass, "Insert"),
  );

  /* Chuỗi cấp cha của chính ô đang mở, để form thêm nhanh điền sẵn (web làm y
     vậy ở DataClass_CheckSelectDialog). Đủ cấp mới truyền — prefill nửa vời là
     bản ghi mới thuộc sai cha, mà lưu được và không báo gì.
     Dùng lại `getParentGate` để luật "đủ cấp cha & parse int" chỉ có một bản. */
  const quickAddPrefill = React.useMemo(
    () =>
      buildQuickAddPrefill(
        isReferenceField ? getParentGate(activeEnumField, formData) : null,
        formData,
      ),
    [activeEnumField, formData, isReferenceField],
  );

  /* Mỗi lần mở picker (hoặc đổi field) là một lượt mới: form thêm nhanh phải
     bắt đầu lại từ trắng, không giữ dữ liệu nhập dở của lượt trước. */
  React.useEffect(() => {
    setQuickAddOpen(false);
  }, [activeEnumField?.name, modalVisible]);

  /**
   * Tạo xong thì chỉ quay về danh sách và tải lại trang đầu — KHÔNG tự điền vào
   * form. Tạo được một bản ghi không có nghĩa là đã chọn nó; việc chọn vẫn phải
   * do người dùng chạm, y như mọi dòng khác trong danh sách.
   *
   * `currentIds` mang id vừa tạo để chắc chắn nó có mặt trong trang đầu, khỏi
   * phải tìm kiếm lại.
   */
  const handleQuickAddCreated = React.useCallback(
    async (createdId: number | null) => {
      setQuickAddOpen(false);

      if (!activeEnumField) return;

      setReferenceErrorMessage(null);
      setRefSearching(true);
      setRefKeyword("");
      setRefPage(0);
      setRefHasMore(true);

      try {
        await loadReferenceModalData(activeEnumField, {
          textSearch: "",
          page: 0,
          append: false,
          currentIds: createdId != null ? [createdId] : undefined,
        });
      } finally {
        setRefSearching(false);
      }
    },
    [
      activeEnumField,
      loadReferenceModalData,
      setRefHasMore,
      setRefKeyword,
      setRefPage,
      setRefSearching,
      setReferenceErrorMessage,
    ],
  );

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
      onQuickAdd={canQuickAdd ? () => setQuickAddOpen(true) : undefined}
      onQuickAddClose={() => setQuickAddOpen(false)}
      quickAddContent={
        quickAddOpen && canQuickAdd ? (
          <ReferenceQuickAddForm
            nameClass={quickAddNameClass}
            fieldLabel={activeEnumField?.moTa}
            prefilledValues={quickAddPrefill.values}
            prefilledLabels={quickAddPrefill.labels}
            title={`Thêm ${
              activeEnumField?.moTa || activeEnumField?.name || "mới"
            }`}
            onCancel={() => setQuickAddOpen(false)}
            onCreated={handleQuickAddCreated}
          />
        ) : null
      }
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
