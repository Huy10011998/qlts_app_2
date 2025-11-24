import { API_ENDPOINTS } from "../../config/API";
import { callApi } from "../../services/data/CallApi";

export const fetchReferenceByFieldWithParent = async (
  referenceName: string,
  fieldName: string,
  parentValue: any,
  setReference: React.Dispatch<React.SetStateAction<Record<string, any[]>>>
) => {
  try {
    const payload: any = {
      type: referenceName,
      currentID: [0],
    };

    if (parentValue != null) {
      payload.lstParent = Array.isArray(parentValue)
        ? parentValue.join(",")
        : String(parentValue);
    }

    const res = await callApi<{ success: boolean; data: { items: any[] } }>(
      "POST",
      API_ENDPOINTS.GET_CATEGORY,
      payload
    );

    const items = (res.data?.items ?? []).map((x: any) => ({
      value: x.id,
      text: x.text,
      typeMulti: x.typeMulti ?? null,
    }));

    setReference((prev) => ({ ...prev, [fieldName]: items }));
  } catch (e) {
    console.log("Lỗi cascade:", e);
  }
};
