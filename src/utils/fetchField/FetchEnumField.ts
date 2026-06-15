import { API_ENDPOINTS } from "../../config/api";
import { callApi } from "../../services/data/callApi";
import type { FetchEnumResponse, SetEnumDataFn } from "../../types/model.d";
import { log } from "../Logger";

export const fetchEnumByField = async (
  enumName: string,
  fieldName: string,
  setEnumData: (fn: SetEnumDataFn) => void,
): Promise<void> => {
  try {
    const res: FetchEnumResponse = await callApi(
      "POST",
      API_ENDPOINTS.GET_CATEGORY_ENUM,
      {
        enumName,
      },
    );
    setEnumData((p: Record<string, any>) => ({
      ...p,
      [fieldName]: Array.isArray(res?.data) ? res.data : [],
    }));
  } catch (e) {
    log("Lỗi tải enum:", e);
  }
};
