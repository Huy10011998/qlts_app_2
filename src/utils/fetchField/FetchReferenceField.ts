import { API_ENDPOINTS } from "../../config/API";
import { callApi } from "../../services/data/CallApi";
import { log } from "../Logger";

export const fetchReferenceByField = async (
  referenceName: string,
  fieldName: string,
  setReference: React.Dispatch<React.SetStateAction<Record<string, any[]>>>
) => {
  try {
    const res = await callApi<{ success: boolean; data: { items: any[] } }>(
      "POST",
      API_ENDPOINTS.GET_CATEGORY,
      { type: referenceName }
    );

    const items = (res.data?.items ?? []).map((x: any) => ({
      value: x.id,
      text: x.text,
      typeMulti: x.typeMulti ?? null,
    }));

    setReference((prev) => ({ ...prev, [fieldName]: items }));
  } catch (e) {
    log("Lỗi tải reference:", e);
  }
};
