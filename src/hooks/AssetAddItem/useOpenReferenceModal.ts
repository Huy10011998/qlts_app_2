import { useCallback } from "react";
import { Alert } from "react-native";
import { Field } from "../../types/Model.d";
import {
  buildReferenceFetchParams,
  getCurrentReferenceIds,
  loadReferenceItemsForField,
} from "./referenceLoaderHelpers";

type Props = {
  formData: Record<string, any>;
  setActiveEnumField: (f: Field) => void;
  setRefKeyword: (v: string) => void;
  setRefPage: (v: number) => void;
  setRefHasMore: (v: boolean) => void;
  setModalVisible: (v: boolean) => void;
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
  setActiveEnumField,
  setRefKeyword,
  setRefPage,
  setRefHasMore,
  setModalVisible,
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
      if (!f.referenceName) return false;

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
        requireAllParents: true,
        onMissingParents: () => {
          Alert.alert(
            "Thông báo",
            "Vui lòng chọn đầy đủ thông tin cấp trên trước!",
          );
        },
      });

      return didLoad !== false;
    },
    [formData, pageSize, setReferenceData],
  );

  const openReferenceModal = useCallback(
    async (f: Field) => {
      if (!f.referenceName) return;
      const didLoad = await loadReferenceModalData(f);
      if (!didLoad) return;

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
      setActiveEnumField,
      setRefKeyword,
      setRefPage,
      setRefHasMore,
      setModalVisible,
    ],
  );

  return { openReferenceModal, loadReferenceModalData };
};
