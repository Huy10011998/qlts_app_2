import { useCallback } from "react";
import type { Field } from "../../types/model.d";
import {
  buildReferenceFetchParams,
  loadReferenceItemsForField,
} from "./referenceLoaderHelpers";

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
      await loadReferenceItemsForField({
        field,
        formData: {},
        setReferenceData,
        params: buildReferenceFetchParams({
          textSearch,
          pageSize: PAGE_SIZE,
          page,
          append,
        }),
      });
    },
    [PAGE_SIZE, setReferenceData],
  );

  return { fetchReferenceData };
};
