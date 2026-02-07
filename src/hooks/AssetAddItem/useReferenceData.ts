import { useCallback } from "react";
import { Field } from "../../types/Model.d";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";

type FetchReferenceParams = {
  textSearch?: string;
  page?: number;
  append?: boolean;
};

export const useReferenceFetcher = (
  setReferenceData: React.Dispatch<React.SetStateAction<any>>,
  PAGE_SIZE: number,
) => {
  const fetchReferenceData = useCallback(
    async (
      field: Field,
      { textSearch = "", page = 0, append = false }: FetchReferenceParams = {},
    ) => {
      if (!field.referenceName) return;

      await fetchReferenceByField(
        field.referenceName,
        field.name,
        setReferenceData,
        {
          textSearch,
          pageSize: PAGE_SIZE,
          skipSize: page * PAGE_SIZE,
          append,
        },
      );
    },
    [setReferenceData],
  );

  return { fetchReferenceData };
};
