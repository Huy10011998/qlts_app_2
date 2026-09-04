import { useCallback } from "react";
import { Alert } from "react-native";
import type { Field } from "../../types/model.d";
import { TypeProperty } from "../../utils/Enum";
import { log } from "../../utils/Logger";
import { getParentGateMessage } from "../../utils/cascade/parentGate";
import {
  buildReferenceFetchParams,
  getCurrentReferenceIds,
  loadReferenceItemsForField,
} from "./referenceLoaderHelpers";

type Props = {
  formData: Record<string, any>;
  /** Chỉ để lấy nhãn field cha cho câu nhắc "Vui lòng chọn ... trước". */
  fieldActive?: Field[];
  setActiveEnumField: (f: Field) => void;
  setRefKeyword: (v: string) => void;
  setRefPage: (v: number) => void;
  setRefHasMore: (v: boolean) => void;
  setModalVisible: (v: boolean) => void;
  setReferenceErrorMessage?: (v: string | null) => void;
  setReferenceData: React.Dispatch<React.SetStateAction<any>>;
  pageSize: number;
};

type LoadReferenceModalOptions = {
  textSearch?: string;
  page?: number;
  append?: boolean;
  currentIds?: Array<string | number>;
};

export const useOpenReferenceModal = ({
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
}: Props) => {
  const loadReferenceModalData = useCallback(
    async (
      f: Field,
      {
        textSearch = "",
        page = 0,
        append = false,
        currentIds,
      }: LoadReferenceModalOptions = {},
    ) => {
      log("[useOpenReferenceModal] loadReferenceModalData", {
        fieldName: f.name,
        fieldMoTa: f.moTa,
        typeProperty: f.typeProperty,
        isEnum: f.typeProperty === TypeProperty.Enum,
        isReference: f.typeProperty === TypeProperty.Reference,
        enumTypeValue: TypeProperty.Enum,
        referenceTypeValue: TypeProperty.Reference,
        enumName: f.enumName,
        referenceName: f.referenceName,
        parentsFields: f.parentsFields,
        currentValue: formData[f.name],
      });

      if (f.typeProperty === TypeProperty.Enum) {
        log("[useOpenReferenceModal] bypass parent validation for enum field", {
          fieldName: f.name,
          typeProperty: f.typeProperty,
        });
        return true;
      }

      if (!f.referenceName) return false;

      setReferenceErrorMessage?.(null);

      const didLoad = await loadReferenceItemsForField({
        field: f,
        formData,
        setReferenceData,
        params: buildReferenceFetchParams({
          textSearch,
          pageSize,
          page,
          append,
          currentIds: currentIds ?? getCurrentReferenceIds(formData, f.name),
        }),
        /* Ô chọn thiếu cấp cha đã bị làm xám không bấm được (xem `parentGate`
           trong RenderInputByType), Alert này là lớp phòng thủ cho trường hợp
           form data đổi ngay lúc chạm. */
        alertOnMissingParents: true,
        onMissingParents: (gate) => {
          log("[useOpenReferenceModal] missing parent fields", {
            fieldName: f.name,
            typeProperty: f.typeProperty,
            enumName: f.enumName,
            referenceName: f.referenceName,
            parentsFields: f.parentsFields,
            missingFields: gate.missingFields,
            currentValue: formData[f.name],
          });
          Alert.alert(
            "Thông báo",
            getParentGateMessage(gate, fieldActive) ||
              "Vui lòng chọn đầy đủ thông tin cấp trên trước!",
          );
        },
      });

      if (
        didLoad &&
        typeof didLoad === "object" &&
        "errorMessage" in didLoad
      ) {
        setReferenceData((prev: any) => ({
          ...prev,
          [f.name]: {
            items: [],
            totalCount: 0,
          },
        }));
        setReferenceErrorMessage?.(
          String(didLoad.errorMessage || "Không thể tải dữ liệu."),
        );
        return "error";
      }

      /* Trả nguyên kết quả tải (items/totalCount) khi thành công: nơi gọi cần
         danh sách vừa về để chọn thẳng bản ghi mới tạo, không đợi state. Vẫn
         giữ `false`/`"error"` cho các nhánh lỗi nên chỗ cũ chỉ kiểm tra truthy
         không bị ảnh hưởng. */
      if (didLoad && typeof didLoad === "object") return didLoad;

      return didLoad !== false;
    },
    [
      fieldActive,
      formData,
      pageSize,
      setReferenceData,
      setReferenceErrorMessage,
    ],
  );

  const openReferenceModal = useCallback(
    async (f: Field) => {
      log("[useOpenReferenceModal] openReferenceModal", {
        fieldName: f.name,
        fieldMoTa: f.moTa,
        typeProperty: f.typeProperty,
        isEnum: f.typeProperty === TypeProperty.Enum,
        isReference: f.typeProperty === TypeProperty.Reference,
        enumTypeValue: TypeProperty.Enum,
        referenceTypeValue: TypeProperty.Reference,
        enumName: f.enumName,
        referenceName: f.referenceName,
        parentsFields: f.parentsFields,
        currentValue: formData[f.name],
      });

      setReferenceErrorMessage?.(null);

      if (f.typeProperty === TypeProperty.Reference) {
        if (!f.referenceName) return;
        const didLoad = await loadReferenceModalData(f);
        if (!didLoad) return;
      }

      // RESET STATE SAU KHI PASS VALIDATION
      setActiveEnumField(f);
      setRefKeyword("");
      setRefPage(0);
      setRefHasMore(true);

      // OPEN MODAL CUỐI (quan trọng)
      setModalVisible(true);
    },
    [
      loadReferenceModalData,
      formData,
      setActiveEnumField,
      setRefKeyword,
      setRefPage,
      setRefHasMore,
      setModalVisible,
      setReferenceErrorMessage,
    ],
  );

  return { openReferenceModal, loadReferenceModalData };
};
