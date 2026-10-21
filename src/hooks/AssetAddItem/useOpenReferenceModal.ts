import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import type { Field, ReferenceDataMap } from "../../types/model.d";
import { TypeProperty } from "../../utils/Enum";
import { log } from "../../utils/Logger";
import {
  getParentGate,
  getParentGateMessage,
  type ParentGate,
} from "../../utils/cascade/parentGate";
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
  /**
   * Id đang chọn gửi kèm `currentID` để trang đầu chắc có nó. Mặc định coi cả
   * giá trị là một id; màn báo cáo tách chuỗi multi thành từng id.
   */
  getCurrentIds?: (
    formData: Record<string, any>,
    field: Field,
  ) => Array<string | number>;
  /** Mặc định `Alert.alert`; màn báo cáo truyền bản chỉ báo khi màn đang hiện. */
  showAlert?: (title: string, message: string) => void;
};

type LoadReferenceModalOptions = {
  textSearch?: string;
  page?: number;
  append?: boolean;
  currentIds?: Array<string | number>;
};

/**
 * - `always`: lượt mở sheet — danh sách đang giữ có thể là của từ khoá cũ hay
 *   của lần mở trước, không được hiện ra trong lúc chờ.
 * - `ifEmpty`: tải lại trang đầu (tìm kiếm, "Thử lại", sau thêm nhanh) — đang
 *   có dòng thì cứ hiện, chỉ khi rỗng mới cần khung chờ thay cho "Không tìm
 *   thấy dữ liệu".
 */
type FirstPageSkeleton = "always" | "ifEmpty";

type ReferenceEntry = {
  items: any[];
  totalCount: number;
  loadingFirstPage?: boolean;
};

/**
 * Picker có đang chờ trang đầu mà chưa có gì đáng tin để hiện không.
 *
 * Cờ gắn thẳng vào entry `referenceData[field]` thay vì một state riêng: form
 * nào cũng đã truyền `referenceData` xuống picker, nên không phải đi thêm prop
 * qua từng form. Fetch thành công ghi đè cả entry nên cờ tự mất; các nhánh còn
 * lại do `useOpenReferenceModal` gỡ.
 */
export const isReferenceFirstPageLoading = (
  referenceData: ReferenceDataMap | undefined,
  fieldName?: string | null,
) =>
  Boolean(
    fieldName &&
      (referenceData?.[fieldName] as ReferenceEntry | undefined)
        ?.loadingFirstPage,
  );

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
  getCurrentIds,
  showAlert,
}: Props) => {
  /* Mỗi lượt tải có số thứ tự; field nào cũng nhớ lượt mới nhất của nó. Lượt
     cũ về muộn (người dùng đã gõ tìm tiếp, đóng rồi mở lại) thì không được gỡ
     cờ chờ hay ghi lỗi đè lên lượt mới. */
  const loadSeqRef = useRef(0);
  const latestLoadRef = useRef<Record<string, number>>({});
  /* Field của lượt mở sheet gần nhất. Lỗi của field khác về muộn thì không
     được hiện trên sheet đang mở. */
  const openFieldRef = useRef<string | null>(null);

  const alertMissingParents = useCallback(
    (f: Field, gate: ParentGate) => {
      log("[useOpenReferenceModal] missing parent fields", {
        fieldName: f.name,
        typeProperty: f.typeProperty,
        enumName: f.enumName,
        referenceName: f.referenceName,
        parentsFields: f.parentsFields,
        missingFields: gate.missingFields,
        currentValue: formData[f.name],
      });
      (showAlert ?? Alert.alert)(
        "Thông báo",
        getParentGateMessage(gate, fieldActive) ||
          "Vui lòng chọn đầy đủ thông tin cấp trên trước!",
      );
    },
    [fieldActive, formData, showAlert],
  );

  const setFirstPageLoading = useCallback(
    (fieldName: string, mode: FirstPageSkeleton) => {
      setReferenceData((prev: Record<string, ReferenceEntry | undefined>) => {
        const entry = prev?.[fieldName];
        if (entry?.loadingFirstPage) return prev;
        if (mode === "ifEmpty" && entry?.items?.length) return prev;

        return {
          ...prev,
          [fieldName]: {
            ...entry,
            items: entry?.items ?? [],
            totalCount: entry?.totalCount ?? 0,
            loadingFirstPage: true,
          },
        };
      });
    },
    [setReferenceData],
  );

  const clearFirstPageLoading = useCallback(
    (fieldName: string) => {
      setReferenceData((prev: Record<string, ReferenceEntry | undefined>) => {
        const entry = prev?.[fieldName];
        if (!entry?.loadingFirstPage) return prev;

        const { loadingFirstPage: _loading, ...rest } = entry;
        return { ...prev, [fieldName]: rest };
      });
    },
    [setReferenceData],
  );

  const runReferenceLoad = useCallback(
    async (
      f: Field,
      {
        textSearch = "",
        page = 0,
        append = false,
        currentIds,
      }: LoadReferenceModalOptions,
      skeleton: FirstPageSkeleton | null,
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

      const loadId = ++loadSeqRef.current;
      latestLoadRef.current[f.name] = loadId;
      setReferenceErrorMessage?.(null);
      if (skeleton) setFirstPageLoading(f.name, skeleton);

      const didLoad = await loadReferenceItemsForField({
        field: f,
        formData,
        setReferenceData,
        params: buildReferenceFetchParams({
          textSearch,
          pageSize,
          page,
          append,
          currentIds:
            currentIds ??
            (getCurrentIds
              ? getCurrentIds(formData, f)
              : getCurrentReferenceIds(formData, f.name)),
        }),
        /* Ô chọn thiếu cấp cha đã bị làm xám không bấm được (xem `parentGate`
           trong RenderInputByType), Alert này là lớp phòng thủ cho trường hợp
           form data đổi ngay lúc chạm. */
        alertOnMissingParents: true,
        onMissingParents: (gate) => alertMissingParents(f, gate),
      });

      const isLatestLoad = latestLoadRef.current[f.name] === loadId;

      if (
        didLoad &&
        typeof didLoad === "object" &&
        "errorMessage" in didLoad
      ) {
        if (isLatestLoad) {
          setReferenceData((prev: any) => ({
            ...prev,
            [f.name]: {
              items: [],
              totalCount: 0,
            },
          }));

          if (openFieldRef.current === f.name) {
            setReferenceErrorMessage?.(
              String(didLoad.errorMessage || "Không thể tải dữ liệu."),
            );
          }
        }
        return "error";
      }

      /* Thành công thì fetch đã ghi đè entry, cờ chờ tự mất. Còn sót là lượt
         này bị một request khác cùng field (ngoài hook) thế chỗ, hoặc bị chặn
         vì cấp cha — gỡ luôn để sheet không đứng ở khung chờ mãi. */
      if (isLatestLoad) clearFirstPageLoading(f.name);

      /* Trả nguyên kết quả tải (items/totalCount) khi thành công: nơi gọi cần
         danh sách vừa về để chọn thẳng bản ghi mới tạo, không đợi state. Vẫn
         giữ `false`/`"error"` cho các nhánh lỗi nên chỗ cũ chỉ kiểm tra truthy
         không bị ảnh hưởng. */
      if (didLoad && typeof didLoad === "object") return didLoad;

      return didLoad !== false;
    },
    [
      alertMissingParents,
      clearFirstPageLoading,
      formData,
      getCurrentIds,
      pageSize,
      setFirstPageLoading,
      setReferenceData,
      setReferenceErrorMessage,
    ],
  );

  const loadReferenceModalData = useCallback(
    (f: Field, options: LoadReferenceModalOptions = {}) =>
      runReferenceLoad(
        f,
        options,
        (options.page ?? 0) === 0 && !options.append ? "ifEmpty" : null,
      ),
    [runReferenceLoad],
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

      const isReference = f.typeProperty === TypeProperty.Reference;

      if (isReference) {
        if (!f.referenceName) return;

        /* Xét cấp cha TRƯỚC khi mở: thiếu cha thì chỉ báo, không bật sheet
           rỗng lên rồi mới báo. Luật chặn vẫn là của loader (`getParentGate`). */
        const gate = getParentGate(f, formData);
        if (gate.hasParents && !gate.isReady) {
          alertMissingParents(f, gate);
          return;
        }
      }

      // RESET STATE SAU KHI PASS VALIDATION
      openFieldRef.current = f.name;
      setActiveEnumField(f);
      setRefKeyword("");
      setRefPage(0);
      setRefHasMore(true);

      /* Mở ngay, không đợi mạng: chạm vào mà không thấy gì suốt một vòng gọi
         API thì người dùng tưởng ô hỏng. Trang đầu vẫn luôn tải lại; cờ chờ
         đặt trước khi mở để ngay khung hình đầu đã là khung chờ, không loé
         "Không tìm thấy dữ liệu". */
      if (isReference) setFirstPageLoading(f.name, "always");
      setModalVisible(true);

      if (isReference) {
        await runReferenceLoad(f, {}, null);
      }
    },
    [
      alertMissingParents,
      formData,
      runReferenceLoad,
      setFirstPageLoading,
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
