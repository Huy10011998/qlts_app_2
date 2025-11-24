import { API_ENDPOINTS } from "../config/API";
import { callApi } from "../services/data/CallApi";
import { FetchEnumResponse, SetEnumDataFn } from "../types/Model.d";
import { log } from "./Logger";

export const fetchEnumByField = async (
  enumName: string,
  fieldName: string,
  setEnumData: (fn: SetEnumDataFn) => void
): Promise<void> => {
  try {
    const res: FetchEnumResponse = await callApi(
      "POST",
      API_ENDPOINTS.GET_CATEGORY_ENUM,
      {
        enumName,
      }
    );
    setEnumData((p: Record<string, any>) => ({
      ...p,
      [fieldName]: Array.isArray(res?.data) ? res.data : [],
    }));
  } catch (e) {
    log("Lỗi tải enum:", e);
  }
};
