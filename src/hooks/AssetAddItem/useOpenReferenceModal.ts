import { useCallback } from "react";
import { Alert } from "react-native";
import { Field } from "../../types/Model.d";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";

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

      const fallbackCurrentIds =
        formData[f.name] != null && formData[f.name] !== ""
          ? [formData[f.name]]
          : [];

      const params = {
        textSearch,
        pageSize,
        skipSize: page * pageSize,
        append,
        currentIds: currentIds ?? fallbackCurrentIds,
      };

      if (f.parentsFields) {
        const parents = f.parentsFields.split(",");

        const parentValues = parents
          .map((p) => formData[p])
          .filter((v) => v != null && v !== "");

        if (parentValues.length !== parents.length) {
          Alert.alert(
            "Thông báo",
            "Vui lòng chọn đầy đủ thông tin cấp trên trước!",
          );
          return false;
        }

        await fetchReferenceByFieldWithParent(
          f.referenceName,
          f.name,
          parentValues.join(","),
          setReferenceData,
          params,
        );

        return true;
      }

      await fetchReferenceByField(
        f.referenceName,
        f.name,
        setReferenceData,
        params,
      );

      return true;
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
