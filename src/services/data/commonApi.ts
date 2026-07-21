import { Buffer } from "buffer";
import { api, callApi } from "./httpClient";
import { API_ENDPOINTS } from "../../config/index";
import { log } from "../../utils/Logger";

export const getClassReference = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", API_ENDPOINTS.GET_CLASS_REFERENCE, {
    referenceName: nameClass,
  });

export const getPropertyClass = async <T = any,>(nameClass: string) =>
  callApi<T>("POST", API_ENDPOINTS.GET_CLASS_BY_NAME, { nameClass });

export const getFieldActive = async <T = any,>(iD_Class_MoTa: string) => {
  log("[API] getFieldActive request", { iD_Class_MoTa });
  const response = await callApi<T>("POST", API_ENDPOINTS.GET_FIELD_ACTIVE, {
    iD_Class_MoTa,
  });

  const responseData = (response as { data?: unknown } | null)?.data;

  log("[API] getFieldActive response", {
    iD_Class_MoTa,
    totalFields: Array.isArray(responseData) ? responseData.length : undefined,
    data: responseData,
  });

  return response;
};

export const getPreviewAttachProperty = async (path: string) => {
  const res = await api.post(API_ENDPOINTS.PREVIEW_ATTACH_PROPERTY, path, {
    responseType: "arraybuffer",
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
  });
  return {
    headers: res.headers,
    data: Buffer.from(res.data, "binary").toString("base64"),
  };
};

export const uploadAttachProperty = async ({ file }: { file: any }) => {
  const form = new FormData();
  form.append("File", {
    uri: file.uri,
    name: file.fileName || file.name,
    type: file.type,
  });
  const res = await callApi<{ data: string }>(
    "POST",
    `/Common/attach-property`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data;
};

export const getPermission = async <T = any,>() =>
  callApi<T>("POST", API_ENDPOINTS.GET_PERMISSION);
