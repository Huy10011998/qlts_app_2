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
  const openReferenceModal = useCallback(
    (f: Field) => {
      if (!f.referenceName) return;

      const params = {
        pageSize,
        skipSize: 0,
      };

      // ⭐ CHECK CASCADE TRƯỚC
      if (f.parentsFields) {
        const parents = f.parentsFields.split(",");

        const parentValues = parents
          .map((p) => formData[p])
          .filter((v) => v != null && v !== "");

        // ❗ KHÔNG mở modal nếu thiếu parent
        if (parentValues.length !== parents.length) {
          Alert.alert(
            "Thông báo",
            "Vui lòng chọn đầy đủ thông tin cấp trên trước!",
          );
          return;
        }

        fetchReferenceByFieldWithParent(
          f.referenceName,
          f.name,
          parentValues.join(","),
          setReferenceData,
          params,
        );
      } else {
        fetchReferenceByField(
          f.referenceName,
          f.name,
          setReferenceData,
          params,
        );
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
      formData,
      setActiveEnumField,
      setRefKeyword,
      setRefPage,
      setRefHasMore,
      setModalVisible,
      setReferenceData,
      pageSize,
    ],
  );

  return { openReferenceModal };
};
